import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    jobId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = params

    // Parse job ID to extract information
    const jobParts = jobId.split('_')
    if (jobParts.length < 3) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      )
    }

    const jobType = jobParts[0] // 'sync' or 'upload'
    const datasetType = jobParts[1] // 'actuals' or 'forecast'
    const datasetId = jobParts[2]

    // Get the dataset to check its current status
    let dataset
    if (datasetType === 'actuals') {
      dataset = await prisma.actualsDataset.findUnique({
        where: { id: datasetId },
        select: {
          id: true,
          name: true,
          loadStatus: true,
          recordCount: true,
          loadedAt: true,
          metadata: true
        }
      })
    } else {
      dataset = await prisma.forecastDataset.findUnique({
        where: { id: datasetId },
        select: {
          id: true,
          name: true,
          loadStatus: true,
          recordCount: true,
          loadedAt: true,
          metadata: true
        }
      })
    }

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      )
    }

    // Determine job status based on dataset status
    let jobStatus = 'UNKNOWN'
    let progress = 0
    let errorMessage = null

    switch (dataset.loadStatus) {
      case 'PENDING':
        jobStatus = 'PENDING'
        progress = 0
        break
      case 'LOADING':
        jobStatus = 'RUNNING'
        progress = 50 // Estimate progress
        break
      case 'COMPLETED':
        jobStatus = 'COMPLETED'
        progress = 100
        break
      case 'FAILED':
        jobStatus = 'FAILED'
        progress = 0
        errorMessage = dataset.metadata?.error || 'Unknown error occurred'
        break
      case 'VALIDATING':
        jobStatus = 'RUNNING'
        progress = 75 // Estimate progress
        break
      default:
        jobStatus = 'UNKNOWN'
        progress = 0
    }

    return NextResponse.json({
      jobId,
      jobType,
      datasetType,
      datasetId,
      datasetName: dataset.name,
      status: jobStatus,
      progress,
      recordCount: dataset.recordCount,
      loadedAt: dataset.loadedAt,
      errorMessage,
      metadata: dataset.metadata
    })

  } catch (error) {
    console.error('Error checking job status:', error)
    return NextResponse.json(
      { error: 'Failed to check job status' },
      { status: 500 }
    )
  }
} 