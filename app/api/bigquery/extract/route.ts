import { NextRequest, NextResponse } from 'next/server'
import { BigQueryService } from '@/lib/bigquery'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      environmentId, 
      tableName, 
      dateRange, 
      orgFilters,
      limit = 1000 
    } = body

    // Validate required fields
    if (!environmentId || !tableName) {
      return NextResponse.json(
        { error: 'Environment ID and table name are required' },
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

    // Initialize BigQuery service
    const bigqueryService = new BigQueryService()
    await bigqueryService.connectWithCredentials(environment.bigqueryCredentials)

    // Build query based on table name
    let query = ''
    const params: any[] = []

    switch (tableName) {
      case 'vVolumeForecast':
        query = `
          SELECT *
          FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vVolumeForecast\`
          WHERE 1=1
        `
        break
      
      case 'vActualVolume':
        query = `
          SELECT *
          FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vActualVolume\`
          WHERE 1=1
        `
        break
      
      case 'vBusinessStructure':
        query = `
          SELECT *
          FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vBusinessStructure\`
          WHERE 1=1
        `
        break
      
      case 'vCalendarDate':
        query = `
          SELECT *
          FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vCalendarDate\`
          WHERE 1=1
        `
        break
      
      case 'vFiscalCalendar':
        query = `
          SELECT *
          FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vFiscalCalendar\`
          WHERE 1=1
        `
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid table name. Supported tables: vVolumeForecast, vActualVolume, vBusinessStructure, vCalendarDate, vFiscalCalendar' },
          { status: 400 }
        )
    }

    // Add date range filters if provided
    if (dateRange?.startDate) {
      query += ` AND Date >= @startDate`
      params.push({ name: 'startDate', value: dateRange.startDate })
    }

    if (dateRange?.endDate) {
      query += ` AND Date <= @endDate`
      params.push({ name: 'endDate', value: dateRange.endDate })
    }

    // Add organization filters if provided
    if (orgFilters) {
      for (let i = 1; i <= 25; i++) {
        const orgKey = `orgBreak${i}`
        if (orgFilters[orgKey]) {
          query += ` AND ${orgKey} = @${orgKey}`
          params.push({ name: orgKey, value: orgFilters[orgKey] })
        }
      }
    }

    // Add limit
    query += ` LIMIT ${limit}`

    // Execute query
    const results = await bigqueryService.executeQuery(query, params)

    // Transform results for better handling
    const transformedResults = results.map((row: any) => {
      // Convert BigQuery row to plain object
      const transformed: any = {}
      for (const [key, value] of Object.entries(row)) {
        // Handle BigQuery specific data types
        if (value && typeof value === 'object' && 'value' in value) {
          transformed[key] = value.value
        } else {
          transformed[key] = value
        }
      }
      return transformed
    })

    return NextResponse.json({
      success: true,
      data: transformedResults,
      count: transformedResults.length,
      query: query,
      environment: {
        id: environment.id,
        name: environment.name,
        projectId: environment.bigqueryProjectId
      }
    })

  } catch (error) {
    console.error('BigQuery extraction failed:', error)
    
    // Handle specific BigQuery errors
    if (error instanceof Error) {
      if (error.message.includes('authentication')) {
        return NextResponse.json(
          { error: 'BigQuery authentication failed. Please check your credentials.' },
          { status: 401 }
        )
      }
      
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Insufficient permissions to access BigQuery data.' },
          { status: 403 }
        )
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'BigQuery table or dataset not found.' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to extract data from BigQuery' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const environmentId = searchParams.get('environmentId')
    const tableName = searchParams.get('tableName')

    if (!environmentId || !tableName) {
      return NextResponse.json(
        { error: 'Environment ID and table name are required' },
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

    // Initialize BigQuery service
    const bigqueryService = new BigQueryService()
    await bigqueryService.connectWithCredentials(environment.bigqueryCredentials)

    // Get table metadata
    const tableInfo = await bigqueryService.getTableInfo(
      environment.bigqueryProjectId,
      environment.bigqueryDataset,
      tableName
    )

    return NextResponse.json({
      success: true,
      tableInfo,
      environment: {
        id: environment.id,
        name: environment.name,
        projectId: environment.bigqueryProjectId
      }
    })

  } catch (error) {
    console.error('Failed to get table info:', error)
    return NextResponse.json(
      { error: 'Failed to get table information' },
      { status: 500 }
    )
  }
} 