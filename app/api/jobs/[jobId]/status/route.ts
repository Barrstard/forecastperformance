import { NextRequest, NextResponse } from 'next/server'
import { bigQuerySyncQueue } from '@/lib/queue'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    jobId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params

    // Get job from queue
    const job = await bigQuerySyncQueue.getJob(jobId)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const jobState = await job.getState()
    // Try multiple ways to get progress from Bull job
    const progress = job._progress || job.progress || 0
    const failedReason = job.failedReason

    // Get additional metadata from database if available
    let databaseMetadata = null
    if (job.data?.datasetId) {
      try {
        if (job.data.jobType === 'forecast') {
          const dataset = await prisma.forecastDataset.findUnique({
            where: { id: job.data.datasetId },
            select: { metadata: true, loadStatus: true, recordCount: true }
          })
          databaseMetadata = dataset?.metadata
        } else if (job.data.jobType === 'actuals') {
          const dataset = await prisma.actualsDataset.findUnique({
            where: { id: job.data.datasetId },
            select: { metadata: true, loadStatus: true, recordCount: true }
          })
          databaseMetadata = dataset?.metadata
        }
      } catch (dbError) {
        console.warn('Could not fetch database metadata:', dbError)
      }
    }

    return NextResponse.json({
      jobId: job.id,
      state: jobState,
      progress: progress,
      failedReason: failedReason || null,
      data: job.data,
      databaseMetadata,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting job status:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
} 