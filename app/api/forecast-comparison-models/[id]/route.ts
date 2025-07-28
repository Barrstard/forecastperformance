import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateComparisonModelRequest } from '@/types/forecast-comparison'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const comparisonModel = await prisma.forecastComparisonModel.findUnique({
      where: { id },
      include: {
        environment: {
          select: {
            id: true,
            name: true,
            bigqueryProjectId: true,
            bigqueryDataset: true
          }
        },
        actualsDataset: {
          include: {
            actualVolumes: {
              select: {
                id: true,
                orgId: true,
                partitionDate: true,
                dailyAmount: true,
                volumeDriver: true,
                brand: true,
                region: true,
                area: true,
                site: true,
                department: true,
                category: true,
                contextName: true,
                orgPathTxt: true,
                syncedAt: true
              },
              orderBy: {
                partitionDate: 'desc'
              },
              take: 100 // Limit for preview
            }
          }
        },
        forecastDatasets: {
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
        },
        comparisonRuns: {
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
        }
      }
    })

    if (!comparisonModel) {
      return NextResponse.json(
        { error: 'Forecast comparison model not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(comparisonModel)
  } catch (error) {
    console.error('Error fetching forecast comparison model:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forecast comparison model' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const body: UpdateComparisonModelRequest = await request.json()

    // Check if model exists
    const existingModel = await prisma.forecastComparisonModel.findUnique({
      where: { id }
    })

    if (!existingModel) {
      return NextResponse.json(
        { error: 'Forecast comparison model not found' },
        { status: 404 }
      )
    }

    // If name is being updated, check for uniqueness
    if (body.name && body.name !== existingModel.name) {
      const nameConflict = await prisma.forecastComparisonModel.findUnique({
        where: { name: body.name }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: 'A forecast comparison model with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (body.name) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.period_start) updateData.period_start = new Date(body.period_start)
    if (body.period_end) updateData.period_end = new Date(body.period_end)
    if (body.status) updateData.status = body.status

    // Update the comparison model
    const updatedModel = await prisma.forecastComparisonModel.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedModel)
  } catch (error) {
    console.error('Error updating forecast comparison model:', error)
    return NextResponse.json(
      { error: 'Failed to update forecast comparison model' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params

    // Check if model exists
    const existingModel = await prisma.forecastComparisonModel.findUnique({
      where: { id }
    })

    if (!existingModel) {
      return NextResponse.json(
        { error: 'Forecast comparison model not found' },
        { status: 404 }
      )
    }

    // Delete the comparison model (cascade will handle related data)
    await prisma.forecastComparisonModel.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Forecast comparison model deleted successfully' })
  } catch (error) {
    console.error('Error deleting forecast comparison model:', error)
    return NextResponse.json(
      { error: 'Failed to delete forecast comparison model' },
      { status: 500 }
    )
  }
} 