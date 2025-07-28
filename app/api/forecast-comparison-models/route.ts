import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateComparisonModelRequest } from '@/types/forecast-comparison'

export async function GET() {
  try {
    const comparisonModels = await prisma.forecastComparisonModel.findMany({
      include: {
        environment: {
          select: {
            id: true,
            name: true,
            bigqueryProjectId: true
          }
        },
        actualsDataset: {
          select: {
            id: true,
            name: true,
            loadStatus: true,
            recordCount: true,
            loadedAt: true
          }
        },
        forecastDatasets: {
          select: {
            id: true,
            name: true,
            modelType: true,
            loadStatus: true,
            recordCount: true,
            loadedAt: true
          }
        },
        comparisonRuns: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(comparisonModels)
  } catch (error) {
    console.error('Error fetching forecast comparison models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forecast comparison models' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateComparisonModelRequest = await request.json()
    
    // Validate required fields
    if (!body.name || !body.environmentId || !body.period_start || !body.period_end) {
      return NextResponse.json(
        { error: 'Missing required fields: name, environmentId, period_start, period_end' },
        { status: 400 }
      )
    }

    // Validate environment exists
    const environment = await prisma.environment.findUnique({
      where: { id: body.environmentId }
    })

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      )
    }

    // Check if name is unique
    const existingModel = await prisma.forecastComparisonModel.findUnique({
      where: { name: body.name }
    })

    if (existingModel) {
      return NextResponse.json(
        { error: 'A forecast comparison model with this name already exists' },
        { status: 409 }
      )
    }

    // Create the comparison model
    const comparisonModel = await prisma.forecastComparisonModel.create({
      data: {
        name: body.name,
        description: body.description,
        environmentId: body.environmentId,
        period_start: new Date(body.period_start),
        period_end: new Date(body.period_end),
        status: 'DRAFT'
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

    return NextResponse.json(comparisonModel, { status: 201 })
  } catch (error) {
    console.error('Error creating forecast comparison model:', error)
    return NextResponse.json(
      { error: 'Failed to create forecast comparison model' },
      { status: 500 }
    )
  }
} 