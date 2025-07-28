import { NextRequest, NextResponse } from 'next/server'
import { bigQuerySyncQueue } from '@/lib/queue'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Get job from queue
    const job = await bigQuerySyncQueue.getJob(jobId)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Get detailed job information
    const jobData = {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress || 0,
      state: await job.getState(),
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      delay: (job as any).delay,
      priority: (job as any).priority,
      returnValue: (job as any).returnvalue
    }

    return NextResponse.json({
      success: true,
      job: jobData
    })

  } catch (error) {
    console.error('Error getting job details:', error)
    return NextResponse.json(
      { error: 'Failed to get job details' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params

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

    const jobState = await job.getState()
    
    // Only allow cancellation of waiting or active jobs
    if (jobState === 'waiting' || jobState === 'active') {
      await job.remove()
      return NextResponse.json({
        success: true,
        message: `Job ${jobId} has been cancelled`
      })
    } else {
      return NextResponse.json(
        { error: `Cannot cancel job in state: ${jobState}` },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error cancelling job:', error)
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params
    const body = await request.json()
    const { action } = body

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

    switch (action) {
      case 'retry':
        try {
          await job.retry()
          return NextResponse.json({
            success: true,
            message: `Job ${jobId} has been queued for retry`
          })
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to retry job' },
            { status: 400 }
          )
        }

      case 'promote':
        try {
          await job.promote()
          return NextResponse.json({
            success: true,
            message: `Job ${jobId} has been promoted`
          })
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to promote job' },
            { status: 400 }
          )
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: retry, promote' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error performing job action:', error)
    return NextResponse.json(
      { error: 'Failed to perform job action' },
      { status: 500 }
    )
  }
}