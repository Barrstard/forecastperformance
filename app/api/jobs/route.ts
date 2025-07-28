import { NextRequest, NextResponse } from 'next/server'
import { bigQuerySyncQueue } from '@/lib/queue'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get all job states
    const waiting = await bigQuerySyncQueue.getWaiting()
    const active = await bigQuerySyncQueue.getActive()
    const completed = await bigQuerySyncQueue.getCompleted()
    const failed = await bigQuerySyncQueue.getFailed()

    // Helper function to extract serializable job data with enhanced metadata
    const extractJobData = async (job: any, state: string) => {
      let enhancedData = { ...job.data }
      
      // Fetch database metadata for active jobs
      if (state === 'active' && job.data?.datasetId) {
        try {
          if (job.data.jobType === 'forecast') {
            const dataset = await prisma.forecastDataset.findUnique({
              where: { id: job.data.datasetId },
              select: { metadata: true }
            })
            if (dataset?.metadata) {
              enhancedData = { ...enhancedData, ...dataset.metadata }
            }
          } else if (job.data.jobType === 'actuals') {
            const dataset = await prisma.actualsDataset.findUnique({
              where: { id: job.data.datasetId },
              select: { metadata: true }
            })
            if (dataset?.metadata) {
              enhancedData = { ...enhancedData, ...dataset.metadata }
            }
          }
        } catch (dbError) {
          console.warn('Could not fetch database metadata for job', job.id, dbError)
        }
      }

      return {
        id: job.id,
        name: job.name,
        data: enhancedData,
        state: state,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        progress: job._progress || job.progress || 0, // Bull stores progress in _progress
        attemptsMade: job.attemptsMade,
        delay: (job as any).delay || 0,
        priority: (job as any).priority || 0
      }
    }

    // Combine all jobs with their state (await the async function)
    const allJobs = await Promise.all([
      ...waiting.map(job => extractJobData(job, 'waiting')),
      ...active.map(job => extractJobData(job, 'active')),
      ...completed.map(job => extractJobData(job, 'completed')),
      ...failed.map(job => extractJobData(job, 'failed'))
    ])

    // Sort by timestamp (newest first)
    allJobs.sort((a, b) => {
      const timeA = a.timestamp || a.processedOn || 0
      const timeB = b.timestamp || b.processedOn || 0
      return timeB - timeA
    })

    // Limit to last 50 jobs for performance
    const recentJobs = allJobs.slice(0, 50)

    // Get queue stats
    const jobCounts = await bigQuerySyncQueue.getJobCounts()

    return NextResponse.json({
      jobs: recentJobs,
      stats: jobCounts,
      totalJobs: allJobs.length
    })

  } catch (error) {
    console.error('Error getting jobs:', error)
    return NextResponse.json(
      { error: 'Failed to get jobs' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const job = await bigQuerySyncQueue.getJob(jobId)
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    await job.remove()
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
} 