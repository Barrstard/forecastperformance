import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateComparisonRunRequest } from '@/types/forecast-comparison'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: comparisonModelId } = await params

    // Check if comparison model exists
    const comparisonModel = await prisma.forecastComparisonModel.findUnique({
      where: { id: comparisonModelId }
    })

    if (!comparisonModel) {
      return NextResponse.json(
        { error: 'Forecast comparison model not found' },
        { status: 404 }
      )
    }

    const comparisonRuns = await prisma.comparisonRun.findMany({
      where: { comparisonModelId },
      include: {
        results: {
          select: {
            id: true,
            forecastDatasetId: true,
            orgId: true,
            partitionDate: true,
            actualValue: true,
            forecastValue: true,
            absoluteError: true,
            percentageError: true,
            accuracyScore: true
          },
          orderBy: {
            partitionDate: 'desc'
          },
          take: 100 // Limit for preview
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(comparisonRuns)
  } catch (error) {
    console.error('Error fetching comparison runs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comparison runs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: comparisonModelId } = params
    const body: CreateComparisonRunRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.selectedForecastIds || body.selectedForecastIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, selectedForecastIds (must not be empty)' },
        { status: 400 }
      )
    }

    // Check if comparison model exists
    const comparisonModel = await prisma.forecastComparisonModel.findUnique({
      where: { id: comparisonModelId },
      include: {
        actualsDataset: true,
        forecastDatasets: {
          where: {
            id: { in: body.selectedForecastIds }
          }
        }
      }
    })

    if (!comparisonModel) {
      return NextResponse.json(
        { error: 'Forecast comparison model not found' },
        { status: 404 }
      )
    }

    // Validate that actuals dataset exists and is loaded
    if (!comparisonModel.actualsDataset) {
      return NextResponse.json(
        { error: 'Actuals dataset is required before running comparisons' },
        { status: 400 }
      )
    }

    if (comparisonModel.actualsDataset.loadStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Actuals dataset must be fully loaded before running comparisons' },
        { status: 400 }
      )
    }

    // Validate that all selected forecast datasets exist and are loaded
    if (comparisonModel.forecastDatasets.length !== body.selectedForecastIds.length) {
      return NextResponse.json(
        { error: 'One or more selected forecast datasets not found' },
        { status: 400 }
      )
    }

    const unloadedDatasets = comparisonModel.forecastDatasets.filter(
      dataset => dataset.loadStatus !== 'COMPLETED'
    )

    if (unloadedDatasets.length > 0) {
      return NextResponse.json(
        { 
          error: 'All selected forecast datasets must be fully loaded before running comparisons',
          unloadedDatasets: unloadedDatasets.map(d => ({ id: d.id, name: d.name, loadStatus: d.loadStatus }))
        },
        { status: 400 }
      )
    }

    // Create the comparison run
    const comparisonRun = await prisma.comparisonRun.create({
      data: {
        comparisonModelId,
        name: body.name,
        selectedForecastIds: body.selectedForecastIds,
        filters: body.filters,
        status: 'PENDING',
        startTime: new Date()
      },
      include: {
        comparisonModel: {
          select: {
            id: true,
            name: true,
            environment: {
              select: {
                id: true,
                name: true,
                bigqueryProjectId: true
              }
            }
          }
        }
      }
    })

    // TODO: Trigger comparison analysis in background
    // This would typically be handled by a job queue system
    // For now, we'll simulate the process

    return NextResponse.json(comparisonRun, { status: 201 })
  } catch (error) {
    console.error('Error creating comparison run:', error)
    return NextResponse.json(
      { error: 'Failed to create comparison run' },
      { status: 500 }
    )
  }
} 