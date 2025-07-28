import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BigQuery } from '@google-cloud/bigquery'
import { bigQuerySyncQueue } from '@/lib/queue'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: comparisonModelId } = await params
    const body = await request.json()
    
    const { startDate, endDate } = body

    // Validate required fields
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: startDate, endDate' },
        { status: 400 }
      )
    }

    // Get the comparison model and its actuals dataset
    const comparisonModel = await prisma.forecastComparisonModel.findUnique({
      where: { id: comparisonModelId },
      include: {
        environment: true,
        actualsDataset: true
      }
    })

    if (!comparisonModel) {
      return NextResponse.json(
        { error: 'Comparison model not found' },
        { status: 404 }
      )
    }

    if (!comparisonModel.actualsDataset) {
      return NextResponse.json(
        { error: 'Actuals dataset not found for this model' },
        { status: 404 }
      )
    }

    const environment = comparisonModel.environment
    const actualsDataset = comparisonModel.actualsDataset

    // Check if there's already a job running for this dataset
    if (actualsDataset.loadStatus === 'PROCESSING' || actualsDataset.loadStatus === 'QUEUED') {
      return NextResponse.json(
        { 
          error: 'A data loading job is already in progress for this actuals dataset',
          currentStatus: actualsDataset.loadStatus,
          jobId: actualsDataset.metadata?.jobId || 'unknown'
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
      FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vActualVolume\` as actuals
      JOIN \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vBusinessStructure\` as bs ON actuals.orgId = bs.orgId
      WHERE (actuals.partitionDate BETWEEN @startDate AND @endDate)
    `

    const [countResult] = await bigquery.query({
      query: countQuery,
      params: { startDate, endDate }
    })

    const totalCount = parseInt(countResult[0].total_count) || 0
    console.log(`Total actuals records to process: ${totalCount.toLocaleString()}`)

    // For small to medium datasets (<50K), process immediately with streaming
    if (totalCount < 50000) {
      return await processSmallActualsDataset(actualsDataset.id, environment, startDate, endDate, totalCount)
    }

    // For larger datasets, use background processing with streaming
    console.log(`Large actuals dataset detected (${totalCount.toLocaleString()} records). Starting background streaming job...`)

    // Add job to queue (queue already has streaming support for actuals)
    const job = await bigQuerySyncQueue.add('actuals', {
      datasetId: actualsDataset.id,
      environment,
      startDate,
      endDate,
      totalCount,
      jobType: 'actuals'
    }, {
      priority: 1,
      delay: 0
    })

    // Update dataset status to queued
    await prisma.actualsDataset.update({
      where: { id: actualsDataset.id },
      data: {
        loadStatus: 'QUEUED',
        recordCount: totalCount,
        metadata: {
          jobId: job.id,
          jobType: 'actuals',
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
      message: `Large actuals dataset (${totalCount.toLocaleString()} records) queued for background streaming processing. Job ID: ${job.id}`
    })

  } catch (error) {
    console.error('Error processing actuals data:', error)
    
    // Update the dataset status to failed
    try {
      const { id: comparisonModelId } = await params
      const comparisonModel = await prisma.forecastComparisonModel.findUnique({
        where: { id: comparisonModelId },
        include: { actualsDataset: true }
      })
      
      if (comparisonModel?.actualsDataset) {
        await prisma.actualsDataset.update({
          where: { id: comparisonModel.actualsDataset.id },
          data: {
            loadStatus: 'FAILED',
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown error',
              lastErrorDate: new Date().toISOString()
            }
          }
        })
      }
    } catch (updateError) {
      console.error('Error updating dataset status:', updateError)
    }

    return NextResponse.json(
      { error: 'Failed to process actuals data' },
      { status: 500 }
    )
  }
}

// Process small actuals datasets immediately using streaming for consistency
async function processSmallActualsDataset(
  datasetId: string, 
  environment: any, 
  startDate: string, 
  endDate: string, 
  totalCount: number
) {
  console.log(`Processing small actuals dataset (${totalCount.toLocaleString()} records) immediately with streaming...`)

  // Import streaming dependencies
  const { StreamingBigQueryService } = require('@/lib/streaming-bigquery')
  const { OptimizedDBWriter } = require('@/lib/optimized-db-writer')

  // Update status to processing
  await prisma.actualsDataset.update({
    where: { id: datasetId },
    data: {
      loadStatus: 'PROCESSING',
      recordCount: totalCount,
      metadata: {
        startDate,
        endDate,
        totalCount,
        startedAt: new Date().toISOString(),
        progress: 0
      }
    }
  })

  // Delete existing data first
  console.log(`Deleting existing actuals data for dataset: ${datasetId}`)
  await prisma.vActualVolume.deleteMany({
    where: { actualsDatasetId: datasetId }
  })

  // Initialize streaming service with optimized config
  const streamingService = new StreamingBigQueryService(
    environment.bigqueryCredentials,
    environment.bigqueryProjectId,
    {
      chunkSize: Math.min(10000, Math.ceil(totalCount / 10)), // Dynamic chunk size based on total count
      maxMemoryMB: 400,  // Higher memory limit for immediate processing
      timeoutMs: 60000,  // 60 second timeout for larger chunks
      retryAttempts: 3
    }
  )

  // Initialize optimized database writer
  const dbWriter = new OptimizedDBWriter({
    batchSize: Math.min(5000, Math.ceil(totalCount / 20)), // Dynamic batch size
    maxConcurrent: 3,    // Allow more concurrent writes for immediate processing
    retryAttempts: 3
  })

  // Build the query to match your SQL format
  const query = `
    SELECT 
      actuals.orgId as orgId, 
      actuals.partitionDate as partitionDate, 
      actuals.dailyAmount as dailyAmount, 
      actuals.volumeDriver as volumeDriver,
      bs.orgBreak2 as brand, 
      bs.orgBreak3 as region,
      bs.orgBreak4 as area,
      bs.orgBreak6 as site,
      bs.orgBreak7 as department,
      bs.orgBreak0 as category,
      bs.contextName as contextName,
      bs.orgPathTxt as orgPathTxt
    FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vActualVolume\` as actuals
    JOIN \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vBusinessStructure\` as bs 
      ON actuals.orgId = bs.orgId
    WHERE actuals.partitionDate BETWEEN @startDate AND @endDate
    ORDER BY actuals.partitionDate DESC
  `

  const params = { startDate, endDate }
  let processedCount = 0
  const startTime = Date.now()

  // Stream and process data in chunks
  await streamingService.streamQuery(
    query,
    params,
    async (chunk: any, streamingJob: any) => {
      // Write chunk to database
      const writeStats = await dbWriter.insertActualsData(
        datasetId,
        chunk
      )

      processedCount += writeStats.insertedRecords

      // Calculate progress and timing metrics
      const progressPercent = Math.round((processedCount / (totalCount || streamingJob.totalEstimate)) * 100)
      const elapsedTimeMs = Date.now() - startTime
      const elapsedTimeSeconds = Math.round(elapsedTimeMs / 1000)
      const recordsPerSecond = processedCount > 0 ? Math.round(processedCount / (elapsedTimeMs / 1000)) : 0

      // Update progress
      try {
        await prisma.actualsDataset.update({
          where: { id: datasetId },
          data: {
            metadata: {
              startDate,
              endDate,
              totalCount: totalCount || streamingJob.totalEstimate,
              processedCount,
              progress: progressPercent,
              memoryUsageMB: streamingJob.memoryUsageMB,
              elapsedTimeSeconds,
              recordsPerSecond,
              lastUpdate: new Date().toISOString()
            }
          }
        })
      } catch (updateError) {
        console.warn('Failed to update progress:', updateError)
      }

      console.log(`Processed ${processedCount.toLocaleString()}/${totalCount.toLocaleString()} records (${progressPercent}%) | ${recordsPerSecond}/sec | Memory: ${streamingJob.memoryUsageMB}MB`)
    },
    `actuals_${datasetId}`,
    'partitionDate'
  )

  // Mark as completed
  await prisma.actualsDataset.update({
    where: { id: datasetId },
    data: {
      loadStatus: 'COMPLETED',
      recordCount: processedCount,
      loadedAt: new Date(),
      metadata: {
        startDate,
        endDate,
        totalCount: processedCount,
        completedAt: new Date().toISOString(),
        progress: 100
      }
    }
  })

  console.log(`Completed small actuals processing: ${processedCount.toLocaleString()} records`)

  return NextResponse.json({
    success: true,
    recordCount: processedCount,
    message: `Successfully processed ${processedCount.toLocaleString()} actuals records using streaming`
  })
} 