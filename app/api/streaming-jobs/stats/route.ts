import { NextRequest, NextResponse } from 'next/server'
import { bigQuerySyncQueue } from '@/lib/queue'

export async function GET(request: NextRequest) {
  try {
    // Get comprehensive queue statistics
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      bigQuerySyncQueue.getWaiting(),
      bigQuerySyncQueue.getActive(),
      bigQuerySyncQueue.getCompleted(),
      bigQuerySyncQueue.getFailed(),
      bigQuerySyncQueue.getDelayed()
    ])

    // Calculate performance metrics
    const totalJobs = waiting.length + active.length + completed.length + failed.length
    const successRate = totalJobs > 0 ? (completed.length / totalJobs) * 100 : 0
    const failureRate = totalJobs > 0 ? (failed.length / totalJobs) * 100 : 0

    // Get memory usage
    const memoryUsage = process.memoryUsage()
    
    // Calculate throughput (completed jobs in last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    const recentCompletedJobs = completed.filter(job => 
      job.finishedOn && job.finishedOn > oneHourAgo
    )

    // Get active job details with progress
    const activeJobDetails = await Promise.all(
      active.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress || 0,
        processedOn: job.processedOn,
        attemptsMade: job.attemptsMade
      }))
    )

    // Get recent failed jobs with error details
    const recentFailedJobs = failed.slice(-5).map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade
    }))

    // Queue health assessment
    const queueHealth = {
      status: active.length > 10 ? 'overloaded' : 
              failed.length > completed.length ? 'degraded' : 'healthy',
      activeJobs: active.length,
      backlog: waiting.length + delayed.length,
      memoryPressure: memoryUsage.heapUsed / 1024 / 1024 > 1024 ? 'high' : 'normal'
    }

    const stats = {
      queue: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: totalJobs
      },
      performance: {
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        throughputLastHour: recentCompletedJobs.length,
        averageJobDuration: calculateAverageJobDuration(completed.slice(-20))
      },
      system: {
        memoryUsage: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        uptime: Math.round(process.uptime())
      },
      health: queueHealth,
      activeJobs: activeJobDetails,
      recentFailures: recentFailedJobs,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Error getting queue stats:', error)
    return NextResponse.json(
      { error: 'Failed to get queue statistics' },
      { status: 500 }
    )
  }
}

// Helper function to calculate average job duration
function calculateAverageJobDuration(completedJobs: any[]): number {
  if (completedJobs.length === 0) return 0
  
  const durations = completedJobs
    .filter(job => job.processedOn && job.finishedOn)
    .map(job => job.finishedOn - job.processedOn)
  
  if (durations.length === 0) return 0
  
  const averageMs = durations.reduce((sum, duration) => sum + duration, 0) / durations.length
  return Math.round(averageMs / 1000) // Convert to seconds
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'clean':
        // Clean completed and failed jobs
        await bigQuerySyncQueue.clean(5 * 60 * 1000) // Clean jobs older than 5 minutes
        return NextResponse.json({
          success: true,
          message: 'Queue cleaned successfully'
        })

      case 'pause':
        await bigQuerySyncQueue.pause()
        return NextResponse.json({
          success: true,
          message: 'Queue paused'
        })

      case 'resume':
        await bigQuerySyncQueue.resume()
        return NextResponse.json({
          success: true,
          message: 'Queue resumed'
        })

      case 'obliterate':
        // Emergency action - remove all jobs
        await bigQuerySyncQueue.obliterate()
        return NextResponse.json({
          success: true,
          message: 'All jobs removed from queue'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: clean, pause, resume, obliterate' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error performing queue action:', error)
    return NextResponse.json(
      { error: 'Failed to perform queue action' },
      { status: 500 }
    )
  }
}