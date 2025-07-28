import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const environmentId = searchParams.get('environmentId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}
    if (environmentId) {
      where.environmentId = environmentId
    }
    if (status && status !== 'all') {
      where.status = status
    }

    // Get forecast runs with pagination
    const [runs, total] = await Promise.all([
      prisma.forecastRun.findMany({
        where,
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset,
        include: {
          environment: {
            select: {
              id: true,
              name: true,
              bigqueryProjectId: true
            }
          }
        }
      }),
      prisma.forecastRun.count({ where })
    ])

    return NextResponse.json({
      runs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Failed to fetch forecast runs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forecast runs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      environmentId, 
      modelId, 
      startDate, 
      endDate, 
      orgIds,
      tables,
      metadata = {}
    } = body

    // Validate required fields
    if (!environmentId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Environment ID, start date, and end date are required' },
        { status: 400 }
      )
    }

    // Check if environment exists
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId }
    })

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      )
    }

    // Generate unique run ID
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create forecast run
    const forecastRun = await prisma.forecastRun.create({
      data: {
        id: runId,
        environmentId,
        modelId: modelId || 'manual-sync',
        bigqueryProjectId: environment.bigqueryProjectId,
        status: 'PENDING',
        startTime: new Date().toISOString(),
        metadata: {
          startDate,
          endDate,
          orgIds,
          tables,
          ...metadata,
          createdAt: new Date().toISOString()
        }
      },
      include: {
        environment: {
          select: {
            id: true,
            name: true,
            bigqueryProjectId: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      forecastRun,
      message: 'Forecast run created successfully'
    })

  } catch (error) {
    console.error('Failed to create forecast run:', error)
    return NextResponse.json(
      { error: 'Failed to create forecast run' },
      { status: 500 }
    )
  }
} 