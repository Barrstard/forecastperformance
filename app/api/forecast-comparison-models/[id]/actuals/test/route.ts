import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BigQuery } from '@google-cloud/bigquery'

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

    // Initialize BigQuery client
    const bigquery = new BigQuery({
      projectId: environment.bigqueryProjectId,
      credentials: environment.bigqueryCredentials
    })

    // Test connection with a count query only (no data processing)
    const testQuery = `
      SELECT COUNT(*) as total_count
      FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vActualVolume\` as actuals
      JOIN \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vBusinessStructure\` as bs ON actuals.orgId = bs.orgId
      WHERE (actuals.partitionDate BETWEEN @startDate AND @endDate)
    `

    const [countResult] = await bigquery.query({
      query: testQuery,
      params: { startDate, endDate }
    })

    const totalCount = parseInt(countResult[0].total_count) || 0

    // Optionally, get a small preview (first 10 records)
    const previewQuery = `
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
      LIMIT 10
    `

    const [previewResult] = await bigquery.query({
      query: previewQuery,
      params: { startDate, endDate }
    })

    return NextResponse.json({
      success: true,
      recordCount: totalCount,
      preview: previewResult,
      message: `Connection test successful! Found ${totalCount.toLocaleString()} records available for processing.`,
      processingType: totalCount < 50000 ? 'immediate' : 'background'
    })

  } catch (error) {
    console.error('Error testing actuals connection:', error)
    return NextResponse.json(
      { error: 'Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}