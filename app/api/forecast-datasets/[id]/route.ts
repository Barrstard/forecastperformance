import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateForecastDatasetRequest } from '@/types/forecast-comparison'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const body: Partial<CreateForecastDatasetRequest> = await request.json()

    // Check if forecast dataset exists
    const existingDataset = await prisma.forecastDataset.findUnique({
      where: { id },
      include: {
        comparisonModel: {
          include: {
            environment: true
          }
        }
      }
    })

    if (!existingDataset) {
      return NextResponse.json(
        { error: 'Forecast dataset not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (body.name) updateData.name = body.name
    if (body.modelType) updateData.modelType = body.modelType
    if (body.dataSource) updateData.dataSource = body.dataSource
    if (body.bigqueryTable !== undefined) updateData.bigqueryTable = body.bigqueryTable
    if (body.ukgDimensionsJobId !== undefined) updateData.ukgDimensionsJobId = body.ukgDimensionsJobId
    if (body.uploadedFile !== undefined) updateData.uploadedFile = body.uploadedFile

    // Reset loading status if configuration changed
    if (Object.keys(updateData).length > 0) {
      updateData.loadStatus = 'PENDING'
      updateData.loadedAt = null
      updateData.recordCount = null
      updateData.dateRange = null
      updateData.metadata = {
        environmentId: existingDataset.comparisonModel.environmentId,
        bigqueryProjectId: existingDataset.comparisonModel.environment.bigqueryProjectId,
        bigqueryDataset: existingDataset.comparisonModel.environment.bigqueryDataset,
        modelType: body.modelType || existingDataset.modelType,
        dataSource: body.dataSource || existingDataset.dataSource,
        updatedAt: new Date().toISOString()
      }
    }

    // Update the forecast dataset
    const updatedDataset = await prisma.forecastDataset.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedDataset)
  } catch (error) {
    console.error('Error updating forecast dataset:', error)
    return NextResponse.json(
      { error: 'Failed to update forecast dataset' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params

    // Check if forecast dataset exists
    const existingDataset = await prisma.forecastDataset.findUnique({
      where: { id }
    })

    if (!existingDataset) {
      return NextResponse.json(
        { error: 'Forecast dataset not found' },
        { status: 404 }
      )
    }

    // Delete the forecast dataset (cascade will handle related data)
    await prisma.forecastDataset.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Forecast dataset deleted successfully' })
  } catch (error) {
    console.error('Error deleting forecast dataset:', error)
    return NextResponse.json(
      { error: 'Failed to delete forecast dataset' },
      { status: 500 }
    )
  }
} 