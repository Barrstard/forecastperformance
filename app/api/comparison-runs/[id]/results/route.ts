import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: comparisonRunId } = params
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = (page - 1) * limit

    // Validate comparison run exists
    const comparisonRun = await prisma.comparisonRun.findUnique({
      where: { id: comparisonRunId }
    })

    if (!comparisonRun) {
      return NextResponse.json(
        { error: 'Comparison run not found' },
        { status: 404 }
      )
    }

    // Get total count
    const total = await prisma.comparisonResult.count({
      where: { comparisonRunId }
    })

    // Get paginated results
    const results = await prisma.comparisonResult.findMany({
      where: { comparisonRunId },
      include: {
        forecastDataset: {
          select: {
            id: true,
            name: true,
            modelType: true
          }
        }
      },
      orderBy: [
        { partitionDate: 'desc' },
        { orgId: 'asc' }
      ],
      skip: offset,
      take: limit
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      results,
      total,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    })
  } catch (error) {
    console.error('Error fetching comparison results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comparison results' },
      { status: 500 }
    )
  }
} 