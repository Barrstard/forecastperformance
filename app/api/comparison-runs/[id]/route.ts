import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params

    const comparisonRun = await prisma.comparisonRun.findUnique({
      where: { id },
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
        },
        results: {
          include: {
            forecastDataset: {
              select: {
                id: true,
                name: true,
                modelType: true
              }
            }
          },
          orderBy: {
            partitionDate: 'desc'
          }
        }
      }
    })

    if (!comparisonRun) {
      return NextResponse.json(
        { error: 'Comparison run not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(comparisonRun)
  } catch (error) {
    console.error('Error fetching comparison run:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comparison run' },
      { status: 500 }
    )
  }
} 