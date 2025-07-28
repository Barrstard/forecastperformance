import { NextRequest, NextResponse } from 'next/server'
import { BigQueryService } from '@/lib/bigquery'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      environmentId, 
      runId,
      startDate, 
      endDate, 
      orgIds,
      tables = ['vVolumeForecast', 'vActualVolume', 'vBusinessStructure', 'vCalendarDate', 'vFiscalCalendar']
    } = body

    // Validate required fields
    if (!environmentId || !runId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Environment ID, run ID, start date, and end date are required' },
        { status: 400 }
      )
    }

    // Get environment configuration
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId }
    })

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      )
    }

    if (!environment.bigqueryCredentials) {
      return NextResponse.json(
        { error: 'BigQuery credentials not configured for this environment' },
        { status: 400 }
      )
    }

    // Create or update forecast run record
    const forecastRun = await prisma.forecastRun.upsert({
      where: { id: runId },
      update: {
        status: 'RUNNING',
        startTime: new Date().toISOString(),
        environmentId,
        bigqueryProjectId: environment.bigqueryProjectId,
        metadata: {
          startDate,
          endDate,
          orgIds,
          tables,
          syncStartedAt: new Date().toISOString()
        }
      },
      create: {
        id: runId,
        environmentId,
        modelId: 'manual-sync',
        bigqueryProjectId: environment.bigqueryProjectId,
        status: 'RUNNING',
        startTime: new Date().toISOString(),
        metadata: {
          startDate,
          endDate,
          orgIds,
          tables,
          syncStartedAt: new Date().toISOString()
        }
      }
    })

    // Initialize BigQuery service
    const bigqueryService = new BigQueryService()
    await bigqueryService.connectWithCredentials(environment.bigqueryCredentials)

    const syncResults: any = {
      runId,
      environmentId,
      projectId: environment.bigqueryProjectId,
      dataset: environment.bigqueryDataset,
      startDate,
      endDate,
      tables: {},
      summary: {
        totalRecords: 0,
        successCount: 0,
        errorCount: 0,
        startTime: new Date().toISOString(),
        endTime: null
      }
    }

    // Sync each table
    for (const tableName of tables) {
      try {
        console.log(`Starting sync for table: ${tableName}`)
        
        const tableResult = await syncTable(
          bigqueryService, 
          runId, 
          tableName, 
          startDate, 
          endDate, 
          orgIds
        )
        
        syncResults.tables[tableName] = tableResult
        syncResults.summary.successCount++
        syncResults.summary.totalRecords += tableResult.recordCount || 0
        
        console.log(`Completed sync for table: ${tableName} - ${tableResult.recordCount} records`)
        
      } catch (error) {
        console.error(`Failed to sync table ${tableName}:`, error)
        syncResults.tables[tableName] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          recordCount: 0
        }
        syncResults.summary.errorCount++
      }
    }

    // Update forecast run with completion status
    syncResults.summary.endTime = new Date().toISOString()
    
    await prisma.forecastRun.update({
      where: { id: runId },
      data: {
        status: syncResults.summary.errorCount === 0 ? 'COMPLETED' : 'FAILED',
        endTime: new Date().toISOString(),
        dataPoints: syncResults.summary.totalRecords,
        metadata: {
          ...forecastRun.metadata,
          syncResults,
          syncCompletedAt: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({
      success: true,
      syncResults,
      message: `Sync completed. ${syncResults.summary.successCount} tables successful, ${syncResults.summary.errorCount} failed.`
    })

  } catch (error) {
    console.error('BigQuery sync failed:', error)
    
    // Update forecast run with error status if runId exists
    if (body?.runId) {
      try {
        await prisma.forecastRun.update({
          where: { id: body.runId },
          data: {
            status: 'FAILED',
            endTime: new Date().toISOString(),
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown error',
              syncFailedAt: new Date().toISOString()
            }
          }
        })
      } catch (updateError) {
        console.error('Failed to update forecast run status:', updateError)
      }
    }

    return NextResponse.json(
      { error: 'Failed to sync data from BigQuery' },
      { status: 500 }
    )
  }
}

async function syncTable(
  bigqueryService: BigQueryService,
  runId: string,
  tableName: string,
  startDate: string,
  endDate: string,
  orgIds?: number[]
): Promise<any> {
  const startTime = Date.now()
  
  try {
    let data: any[] = []
    
    // Extract data based on table name
    switch (tableName) {
      case 'vVolumeForecast':
        data = await bigqueryService.extractVolumeForecasts(startDate, endDate, orgIds)
        break
      
      case 'vActualVolume':
        data = await bigqueryService.extractActualVolumes(startDate, endDate, orgIds)
        break
      
      case 'vBusinessStructure':
        data = await bigqueryService.extractBusinessStructure(orgIds)
        break
      
      case 'vCalendarDate':
        data = await bigqueryService.extractCalendarData(startDate, endDate)
        break
      
      case 'vFiscalCalendar':
        data = await bigqueryService.extractFiscalCalendarData(startDate, endDate)
        break
      
      default:
        throw new Error(`Unsupported table: ${tableName}`)
    }

    // Transform and insert data into PostgreSQL
    const insertResult = await insertTableData(runId, tableName, data)
    
    const endTime = Date.now()
    
    return {
      success: true,
      recordCount: data.length,
      insertResult,
      duration: endTime - startTime,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    }
    
  } catch (error) {
    const endTime = Date.now()
    throw new Error(`Table sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function insertTableData(runId: string, tableName: string, data: any[]): Promise<any> {
  if (data.length === 0) {
    return { inserted: 0, skipped: 0 }
  }

  const batchSize = 1000
  let inserted = 0
  let skipped = 0

  try {
    // Process data in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      const transformedBatch = batch.map(row => transformRowForInsertion(runId, tableName, row))
      
      // Use appropriate Prisma model based on table name
      switch (tableName) {
        case 'vVolumeForecast':
          await prisma.vVolumeForecast.createMany({
            data: transformedBatch,
            skipDuplicates: true
          })
          break
          
        case 'vActualVolume':
          await prisma.vActualVolume.createMany({
            data: transformedBatch,
            skipDuplicates: true
          })
          break
          
        case 'vBusinessStructure':
          await prisma.vBusinessStructure.createMany({
            data: transformedBatch,
            skipDuplicates: true
          })
          break
          
        case 'vCalendarDate':
          await prisma.vCalendarDate.createMany({
            data: transformedBatch,
            skipDuplicates: true
          })
          break
          
        case 'vFiscalCalendar':
          await prisma.vFiscalCalendar.createMany({
            data: transformedBatch,
            skipDuplicates: true
          })
          break
          
        default:
          throw new Error(`Unsupported table for insertion: ${tableName}`)
      }
      
      inserted += transformedBatch.length
    }
    
    return { inserted, skipped }
    
  } catch (error) {
    console.error(`Failed to insert data for table ${tableName}:`, error)
    throw error
  }
}

function transformRowForInsertion(runId: string, tableName: string, row: any): any {
  // Transform BigQuery row to PostgreSQL format
  const transformed: any = { runId }
  
  for (const [key, value] of Object.entries(row)) {
    // Handle BigQuery specific data types
    if (value && typeof value === 'object' && 'value' in value) {
      transformed[key] = value.value
    } else {
      transformed[key] = value
    }
    
    // Convert date strings to Date objects
    if (typeof transformed[key] === 'string' && isDateString(transformed[key])) {
      transformed[key] = new Date(transformed[key])
    }
  }
  
  return transformed
}

function isDateString(str: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}/
  return dateRegex.test(str)
} 