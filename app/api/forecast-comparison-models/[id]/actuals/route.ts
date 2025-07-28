import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateActualsDatasetRequest } from '@/types/forecast-comparison'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: comparisonModelId } = params
    const body: CreateActualsDatasetRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.dataSource) {
      return NextResponse.json(
        { error: 'Missing required fields: name, dataSource' },
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

    // Check if actuals dataset already exists for this model
    const existingActuals = await prisma.actualsDataset.findUnique({
      where: { comparisonModelId }
    })

    if (existingActuals) {
      return NextResponse.json(
        { error: 'Actuals dataset already exists for this comparison model' },
        { status: 409 }
      )
    }

    // Create the actuals dataset
    const actualsDataset = await prisma.actualsDataset.create({
      data: {
        comparisonModelId,
        name: body.name,
        dataSource: body.dataSource,
        bigqueryTable: body.bigqueryTable,
        uploadedFile: body.uploadedFile,
        loadStatus: 'PENDING',
        metadata: {
          environmentId: comparisonModel.environmentId,
          bigqueryProjectId: comparisonModel.environment.bigqueryProjectId,
          bigqueryDataset: comparisonModel.environment.bigqueryDataset
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

    return NextResponse.json(actualsDataset, { status: 201 })
  } catch (error) {
    console.error('Error creating actuals dataset:', error)
    return NextResponse.json(
      { error: 'Failed to create actuals dataset' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: comparisonModelId } = params
    const body: CreateActualsDatasetRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.dataSource) {
      return NextResponse.json(
        { error: 'Missing required fields: name, dataSource' },
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

    // Check if actuals dataset exists
    const existingActuals = await prisma.actualsDataset.findUnique({
      where: { comparisonModelId }
    })

    if (!existingActuals) {
      return NextResponse.json(
        { error: 'Actuals dataset not found' },
        { status: 404 }
      )
    }

    // Update the actuals dataset
    const updatedActuals = await prisma.actualsDataset.update({
      where: { comparisonModelId },
      data: {
        name: body.name,
        dataSource: body.dataSource,
        bigqueryTable: body.bigqueryTable,
        uploadedFile: body.uploadedFile,
        loadStatus: 'PENDING', // Reset status when updating
        loadedAt: null,
        recordCount: null,
        dateRange: null,
        metadata: {
          environmentId: comparisonModel.environmentId,
          bigqueryProjectId: comparisonModel.environment.bigqueryProjectId,
          bigqueryDataset: comparisonModel.environment.bigqueryDataset,
          updatedAt: new Date().toISOString()
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

    return NextResponse.json(updatedActuals)
  } catch (error) {
    console.error('Error updating actuals dataset:', error)
    return NextResponse.json(
      { error: 'Failed to update actuals dataset' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: comparisonModelId } = params

    // Check if actuals dataset exists
    const existingActuals = await prisma.actualsDataset.findUnique({
      where: { comparisonModelId }
    })

    if (!existingActuals) {
      return NextResponse.json(
        { error: 'Actuals dataset not found' },
        { status: 404 }
      )
    }

    // Delete the actuals dataset (cascade will handle related data)
    await prisma.actualsDataset.delete({
      where: { comparisonModelId }
    })

    return NextResponse.json({ message: 'Actuals dataset deleted successfully' })
  } catch (error) {
    console.error('Error deleting actuals dataset:', error)
    return NextResponse.json(
      { error: 'Failed to delete actuals dataset' },
      { status: 500 }
    )
  }
} 