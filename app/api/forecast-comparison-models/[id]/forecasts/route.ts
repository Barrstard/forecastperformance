import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateForecastDatasetRequest } from '@/types/forecast-comparison'

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

    const forecastDatasets = await prisma.forecastDataset.findMany({
      where: { comparisonModelId },
      include: {
        volumeForecasts: {
          select: {
            id: true,
            orgId: true,
            partitionDate: true,
            dailyAmount: true,
            volumeType: true,
            volumeDriver: true,
            syncedAt: true
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

    return NextResponse.json(forecastDatasets)
  } catch (error) {
    console.error('Error fetching forecast datasets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forecast datasets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: comparisonModelId } = await params
    const body: CreateForecastDatasetRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.modelType || !body.dataSource) {
      return NextResponse.json(
        { error: 'Missing required fields: name, modelType, dataSource' },
        { status: 400 }
      )
    }

    // Check if comparison model exists
    const comparisonModel = await prisma.forecastComparisonModel.findUnique({
      where: { id: comparisonModelId },
      include: {
        environment: true
      }
    })

    if (!comparisonModel) {
      return NextResponse.json(
        { error: 'Forecast comparison model not found' },
        { status: 404 }
      )
    }

    // Create the forecast dataset
    const forecastDataset = await prisma.forecastDataset.create({
      data: {
        comparisonModelId,
        name: body.name,
        modelType: body.modelType,
        dataSource: body.dataSource,
        bigqueryTable: body.bigqueryTable,
        ukgDimensionsJobId: body.ukgDimensionsJobId,
        uploadedFile: body.uploadedFile,
        loadStatus: 'PENDING',
        metadata: {
          environmentId: comparisonModel.environmentId,
          bigqueryProjectId: comparisonModel.environment.bigqueryProjectId,
          bigqueryDataset: comparisonModel.environment.bigqueryDataset,
          modelType: body.modelType,
          dataSource: body.dataSource
        }
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

    return NextResponse.json(forecastDataset, { status: 201 })
  } catch (error) {
    console.error('Error creating forecast dataset:', error)
    return NextResponse.json(
      { error: 'Failed to create forecast dataset' },
      { status: 500 }
    )
  }
} 