import { NextRequest, NextResponse } from 'next/server'
import { BigQueryService } from '@/lib/bigquery'

export async function POST(request: NextRequest) {
  try {
    const { credentials, dataset } = await request.json()

    if (!credentials) {
      return NextResponse.json(
        { success: false, error: 'BigQuery credentials are required' },
        { status: 400 }
      )
    }

    const bigQueryService = new BigQueryService()
    const result = await bigQueryService.connectWithCredentials(credentials, dataset)

    if (result.success) {
      return NextResponse.json({
        success: true,
        projectId: result.projectId,
        dataset: result.dataset,
        availableTables: result.availableTables
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        projectId: result.projectId,
        suggestions: result.suggestions
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('BigQuery connection error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to connect to BigQuery'
    }, { status: 500 })
  }
} 