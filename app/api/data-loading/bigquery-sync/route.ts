import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BigQueryService } from '@/lib/bigquery'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { datasetId, datasetType, bigqueryConfig } = body

    // Validate required fields
    if (!datasetId || !datasetType || !bigqueryConfig) {
      return NextResponse.json(
        { error: 'Missing required fields: datasetId, datasetType, bigqueryConfig' },
        { status: 400 }
      )
    }

    // Validate dataset type
    if (!['actuals', 'forecast'].includes(datasetType)) {
      return NextResponse.json(
        { error: 'Invalid datasetType. Must be "actuals" or "forecast"' },
        { status: 400 }
      )
    }

    // Get the dataset
    let dataset
    if (datasetType === 'actuals') {
      dataset = await prisma.actualsDataset.findUnique({
        where: { id: datasetId },
        include: {
          comparisonModel: {
            include: {
              environment: true
            }
          }
        }
      })
    } else {
      dataset = await prisma.forecastDataset.findUnique({
        where: { id: datasetId },
        include: {
          comparisonModel: {
            include: {
              environment: true
            }
          }
        }
      })
    }

    if (!dataset) {
      return NextResponse.json(
        { error: `${datasetType} dataset not found` },
        { status: 404 }
      )
    }

    // Update dataset status to loading
    if (datasetType === 'actuals') {
      await prisma.actualsDataset.update({
        where: { id: datasetId },
        data: { loadStatus: 'LOADING' }
      })
    } else {
      await prisma.forecastDataset.update({
        where: { id: datasetId },
        data: { loadStatus: 'LOADING' }
      })
    }

    // Generate a job ID for tracking
    const jobId = `sync_${datasetType}_${datasetId}_${Date.now()}`

    // Initialize BigQuery service
    const bigQueryService = new BigQueryService()
    
    try {
      // Connect to BigQuery using environment credentials
      await bigQueryService.connectWithCredentials(
        dataset.comparisonModel.environment.bigqueryCredentials as any
      )

      // Determine the table to sync based on dataset type
      let tableName = dataset.bigqueryTable
      if (!tableName) {
        if (datasetType === 'actuals') {
          tableName = 'vActualVolume'
        } else {
          tableName = 'vVolumeForecast'
        }
      }

      // Build the query based on dataset type and configuration
      let query = ''
      if (datasetType === 'actuals') {
        query = `
          SELECT 
            orgId,
            partitionDate,
            dailyAmount,
            volumeDriverId,
            posLabel,
            posLabelId,
            updateDtm,
            linkedCategoryType,
            includeSummarySwt
          FROM \`${bigQueryService.getProjectId()}.${bigQueryService.getDataset()}.${tableName}\`
          WHERE 1=1
        `
      } else {
        // Enhanced forecast query with business structure join
        query = `
          SELECT 
            forecast.orgId as orgId, 
            forecast.partitionDate as partitionDate, 
            forecast.dailyAmount as dailyAmount, 
            forecast.volumeDriver as volumeDriver, 
            forecast.volumeType as volumeType,
            forecast.volumeTypeId as volumeTypeId,
            forecast.currency as currency,
            forecast.currencyId as currencyId,
            forecast.eventRatio as eventRatio,
            forecast.volumeDriverId as volumeDriverId,
            forecast.updateDtm as updateDtm,
            forecast.linkedCategoryType as linkedCategoryType,
            forecast.includeSummarySwt as includeSummarySwt,
            bs.orgBreak2 as brand,  
            bs.orgBreak3 as region,
            bs.orgBreak4 as area,
            bs.orgBreak6 as site,
            bs.orgBreak7 as department,
            bs.orgBreak0 as category,
            bs.contextName as contextName,
            bs.orgPathTxt as orgPathTxt
          FROM \`${bigQueryService.getProjectId()}.${bigQueryService.getDataset()}.${tableName}\` as forecast
          JOIN \`${bigQueryService.getProjectId()}.${bigQueryService.getDataset()}.vBusinessStructure\` as bs 
            ON forecast.orgId = bs.orgId
          WHERE 1=1
        `
      }

      // Add date range filters if specified
      if (bigqueryConfig.dateRange) {
        query += ` AND partitionDate >= '${bigqueryConfig.dateRange.start}'`
        query += ` AND partitionDate <= '${bigqueryConfig.dateRange.end}'`
      }

      // Add additional filters if specified
      if (bigqueryConfig.filters) {
        Object.entries(bigqueryConfig.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              query += ` AND ${key} IN (${value.map(v => `'${v}'`).join(',')})`
            } else {
              query += ` AND ${key} = '${value}'`
            }
          }
        })
      }

      // Add volumeType filter for forecasts if specified
      if (datasetType === 'forecast' && bigqueryConfig.volumeType) {
        query += ` AND forecast.volumeType = '${bigqueryConfig.volumeType}'`
      }

      query += ` ORDER BY partitionDate DESC, orgId ASC`

      // Execute the query and get results
      const results = await bigQueryService.executeQuery(query)

      // Check if this is a preview request
      if (bigqueryConfig.preview) {
        return NextResponse.json({
          jobId,
          status: 'PREVIEW',
          recordCount: results?.length || 0,
          preview: results?.slice(0, 5), // Return first 5 records as preview
          message: `Preview: Found ${results?.length || 0} records`
        })
      }

      // Process and insert the data
      let recordCount = 0
      if (results && results.length > 0) {
        if (datasetType === 'actuals') {
          // Insert actual volumes
          const actualVolumes = results.map((row: any) => ({
            actualsDatasetId: datasetId,
            orgId: row.orgId,
            partitionDate: new Date(row.partitionDate),
            dailyAmount: row.dailyAmount,
            volumeDriverId: row.volumeDriverId,
            posLabel: row.posLabel,
            posLabelId: row.posLabelId,
            updateDtm: new Date(row.updateDtm),
            linkedCategoryType: row.linkedCategoryType,
            includeSummarySwt: row.includeSummarySwt
          }))

          // Batch insert in chunks to avoid memory issues
          const chunkSize = 1000
          for (let i = 0; i < actualVolumes.length; i += chunkSize) {
            const chunk = actualVolumes.slice(i, i + chunkSize)
            await prisma.vActualVolume.createMany({
              data: chunk,
              skipDuplicates: true
            })
          }
          recordCount = actualVolumes.length
        } else {
          // Insert volume forecasts with business structure fields
          const volumeForecasts = results.map((row: any) => ({
            forecastDatasetId: datasetId,
            orgId: row.orgId,
            partitionDate: new Date(row.partitionDate),
            volumeType: row.volumeType,
            volumeTypeId: row.volumeTypeId,
            currency: row.currency,
            currencyId: row.currencyId,
            eventRatio: row.eventRatio,
            dailyAmount: row.dailyAmount,
            volumeDriver: row.volumeDriver,
            volumeDriverId: row.volumeDriverId,
            updateDtm: new Date(row.updateDtm),
            linkedCategoryType: row.linkedCategoryType,
            includeSummarySwt: row.includeSummarySwt,
            // Business structure fields from join
            brand: row.brand,
            region: row.region,
            area: row.area,
            site: row.site,
            department: row.department,
            category: row.category,
            contextName: row.contextName,
            orgPathTxt: row.orgPathTxt
          }))

          // Batch insert in chunks to avoid memory issues
          const chunkSize = 1000
          for (let i = 0; i < volumeForecasts.length; i += chunkSize) {
            const chunk = volumeForecasts.slice(i, i + chunkSize)
            await prisma.vVolumeForecast.createMany({
              data: chunk,
              skipDuplicates: true
            })
          }
          recordCount = volumeForecasts.length
        }
      }

      // Update dataset with completion status
      const dateRange = bigqueryConfig.dateRange ? {
        start: bigqueryConfig.dateRange.start,
        end: bigqueryConfig.dateRange.end
      } : null

      if (datasetType === 'actuals') {
        await prisma.actualsDataset.update({
          where: { id: datasetId },
          data: {
            loadStatus: 'COMPLETED',
            recordCount,
            dateRange,
            loadedAt: new Date()
          }
        })
      } else {
        await prisma.forecastDataset.update({
          where: { id: datasetId },
          data: {
            loadStatus: 'COMPLETED',
            recordCount,
            dateRange,
            loadedAt: new Date()
          }
        })
      }

      return NextResponse.json({
        jobId,
        status: 'COMPLETED',
        recordCount,
        message: `Successfully synced ${recordCount} records from BigQuery`
      })

    } catch (error) {
      console.error('BigQuery sync error:', error)
      
      // Update dataset with error status
      if (datasetType === 'actuals') {
        await prisma.actualsDataset.update({
          where: { id: datasetId },
          data: { 
            loadStatus: 'FAILED',
            metadata: {
              ...dataset.metadata,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        })
      } else {
        await prisma.forecastDataset.update({
          where: { id: datasetId },
          data: { 
            loadStatus: 'FAILED',
            metadata: {
              ...dataset.metadata,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        })
      }

      return NextResponse.json(
        { 
          jobId,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in BigQuery sync:', error)
    return NextResponse.json(
      { error: 'Failed to sync BigQuery data' },
      { status: 500 }
    )
  }
} 