import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BigQuery } from '@google-cloud/bigquery'
import { bigQuerySyncQueue } from '@/lib/queue'

interface RouteParams {
  params: {
    id: string
    datasetId: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: comparisonModelId, datasetId } = await params
    const body = await request.json()
    
    const { volumeType, startDate, endDate } = body

    // Validate required fields
    if (!volumeType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: volumeType, startDate, endDate' },
        { status: 400 }
      )
    }

    // Get the forecast dataset and its associated comparison model
    const forecastDataset = await prisma.forecastDataset.findUnique({
      where: { id: datasetId },
      include: {
        comparisonModel: {
          include: {
            environment: true
          }
        }
      }
    })

    if (!forecastDataset) {
      return NextResponse.json(
        { error: 'Forecast dataset not found' },
        { status: 404 }
      )
    }

    const environment = forecastDataset.comparisonModel.environment

    // Check if there's already a job running for this dataset
    if (forecastDataset.loadStatus === 'PROCESSING' || forecastDataset.loadStatus === 'QUEUED') {
      return NextResponse.json(
        { 
          error: 'A data loading job is already in progress for this forecast dataset',
          currentStatus: forecastDataset.loadStatus,
          jobId: forecastDataset.metadata?.jobId || 'unknown'
        },
        { status: 409 }
      )
    }

    // Initialize BigQuery client
    const bigquery = new BigQuery({
      projectId: environment.bigqueryProjectId,
      credentials: environment.bigqueryCredentials
    })

    // First, get a count of total records
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vVolumeForecast\` as forecast
      JOIN \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vBusinessStructure\` as bs ON forecast.orgId = bs.orgId
      WHERE forecast.volumeType = @volumeType
      AND (forecast.partitionDate BETWEEN @startDate AND @endDate)
    `

    const [countResult] = await bigquery.query({
      query: countQuery,
      params: { volumeType, startDate, endDate }
    })

    const totalCount = parseInt(countResult[0].total_count) || 0
    console.log(`Total records to process: ${totalCount.toLocaleString()}`)

    // For small to medium datasets (<50K), process immediately with streaming
    if (totalCount < 50000) {
      return await processSmallDataset(datasetId, environment, volumeType, startDate, endDate, totalCount)
    }

    // For larger datasets, use background processing
    console.log(`Large dataset detected (${totalCount.toLocaleString()} records). Starting background job...`)

    // Add job to queue
    const job = await bigQuerySyncQueue.add('forecast', {
      datasetId,
      environment,
      volumeType,
      startDate,
      endDate,
      totalCount,
      jobType: 'forecast'
    }, {
      priority: 1,
      delay: 0
    })

    // Update dataset status to queued
    await prisma.forecastDataset.update({
      where: { id: datasetId },
      data: {
        loadStatus: 'QUEUED',
        recordCount: totalCount,
        metadata: {
          jobId: job.id,
          jobType: 'forecast',
          volumeType,
          startDate,
          endDate,
          totalCount,
          queuedAt: new Date().toISOString(),
          progress: 0
        }
      }
    })

    return NextResponse.json({
      success: true,
      recordCount: totalCount,
      backgroundProcessing: true,
      jobId: job.id,
      message: `Large dataset (${totalCount.toLocaleString()} records) queued for background processing. Job ID: ${job.id}`
    })

  } catch (error) {
    console.error('Error processing forecast data:', error)
    
    // Update the dataset status to failed
    try {
      await prisma.forecastDataset.update({
        where: { id: (await params).datasetId },
        data: {
          loadStatus: 'FAILED',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            lastErrorDate: new Date().toISOString()
          }
        }
      })
    } catch (updateError) {
      console.error('Error updating dataset status:', updateError)
    }

    return NextResponse.json(
      { error: 'Failed to process forecast data' },
      { status: 500 }
    )
  }
}

// Process small datasets immediately
async function processSmallDataset(
  datasetId: string, 
  environment: any, 
  volumeType: string, 
  startDate: string, 
  endDate: string, 
  totalCount: number
) {
  console.log(`Processing small dataset (${totalCount.toLocaleString()} records) immediately...`)

  const bigquery = new BigQuery({
    projectId: environment.bigqueryProjectId,
    credentials: environment.bigqueryCredentials
  })

  // Update status to processing
  await prisma.forecastDataset.update({
    where: { id: datasetId },
    data: {
      loadStatus: 'PROCESSING',
      recordCount: totalCount,
      metadata: {
        volumeType,
        startDate,
        endDate,
        totalCount,
        startedAt: new Date().toISOString()
      }
    }
  })

  // Build the query
  const query = `
    SELECT 
      forecast.orgId as orgId, 
      forecast.partitionDate as partitionDate, 
      forecast.dailyAmount as dailyAmount, 
      forecast.volumeDriver as volumeDriver, 
      bs.orgBreak2 as brand,  
      bs.orgBreak3 as region,
      bs.orgBreak4 as area,
      bs.orgBreak6 as site,
      bs.orgBreak7 as department,
      bs.orgBreak0 as category,
      bs.contextName as contextName,
      bs.orgPathTxt as orgPathTxt
    FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vVolumeForecast\` as forecast
    JOIN \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vBusinessStructure\` as bs ON forecast.orgId = bs.orgId
    WHERE forecast.volumeType = @volumeType
      AND forecast.partitionDate BETWEEN @startDate AND @endDate
    ORDER BY forecast.partitionDate DESC
  `

  // Execute the query
  const [rows] = await bigquery.query({
    query,
    params: { volumeType, startDate, endDate }
  })

  console.log(`BigQuery query returned ${rows.length.toLocaleString()} records`)

  // Delete existing data first
  console.log(`Deleting existing forecast data for dataset: ${datasetId}`)
  await prisma.vVolumeForecast.deleteMany({
    where: { forecastDatasetId: datasetId }
  })

  // Process data in smaller chunks
  if (rows.length > 0) {
    console.log(`Processing ${rows.length.toLocaleString()} rows for database insertion...`)
    
    const batchSize = 1000
    let insertedCount = 0
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      
      const forecastData = batch.map((row: any, index: number) => {
        // Parse the date and convert to date-only (no time)
        let partitionDate: Date
        try {
          if (row.partitionDate instanceof Date) {
            partitionDate = new Date(row.partitionDate.toISOString().split('T')[0] + 'T00:00:00.000Z')
          } else if (typeof row.partitionDate === 'string') {
            const dateOnly = row.partitionDate.split('T')[0] // Extract date part only
            partitionDate = new Date(dateOnly + 'T00:00:00.000Z')
          } else if (row.partitionDate && typeof row.partitionDate.value === 'string') {
            const dateOnly = row.partitionDate.value.split('T')[0] // Extract date part only
            partitionDate = new Date(dateOnly + 'T00:00:00.000Z')
          } else {
            console.warn(`Could not parse date for row ${index}:`, { orgId: row.orgId, partitionDate: row.partitionDate })
            partitionDate = new Date()
          }
          
          if (isNaN(partitionDate.getTime())) {
            console.warn(`Invalid date parsed for row ${index}:`, { orgId: row.orgId, partitionDate: row.partitionDate })
            partitionDate = new Date()
          }
        } catch (error) {
          console.warn(`Error parsing date for row ${index}:`, { orgId: row.orgId, partitionDate: row.partitionDate }, error)
          partitionDate = new Date()
        }

        return {
          forecastDatasetId: datasetId,
          orgId: parseInt(row.orgId) || 0,
          partitionDate,
          dailyAmount: parseFloat(row.dailyAmount) || 0,
          volumeDriver: (row.volumeDriver || '').substring(0, 65535),
          volumeType: volumeType,
          brand: (row.brand || '').substring(0, 65535),
          region: (row.region || '').substring(0, 65535),
          area: (row.area || '').substring(0, 65535),
          site: (row.site || '').substring(0, 65535),
          department: (row.department || '').substring(0, 65535),
          category: (row.category || '').substring(0, 65535),
          contextName: (row.contextName || '').substring(0, 65535),
          orgPathTxt: (row.orgPathTxt || '').substring(0, 65535)
        }
      })

      try {
        await prisma.vVolumeForecast.createMany({
          data: forecastData
        })
        
        insertedCount += batch.length
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rows.length / batchSize)}: ${insertedCount.toLocaleString()}/${rows.length.toLocaleString()} records`)
        
        // Update progress
        await prisma.forecastDataset.update({
          where: { id: datasetId },
          data: {
            metadata: {
              volumeType,
              startDate,
              endDate,
              totalCount,
              processedCount: insertedCount,
              progress: Math.round((insertedCount / rows.length) * 100),
              lastUpdate: new Date().toISOString()
            }
          }
        })
      } catch (batchError) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, batchError)
        throw batchError
      }
    }
    
    console.log(`Successfully inserted ${insertedCount.toLocaleString()} forecast records for dataset: ${datasetId}`)
  }

  // Mark as completed
  await prisma.forecastDataset.update({
    where: { id: datasetId },
    data: {
      loadStatus: 'COMPLETED',
      recordCount: rows.length,
      loadedAt: new Date(),
      metadata: {
        volumeType,
        startDate,
        endDate,
        totalCount: rows.length,
        completedAt: new Date().toISOString()
      }
    }
  })

  return NextResponse.json({
    success: true,
    recordCount: rows.length,
    data: rows.slice(0, 100), // Return first 100 records for preview
    message: `Successfully processed ${rows.length.toLocaleString()} records`
  })
} 