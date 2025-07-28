import { NextRequest, NextResponse } from 'next/server'
import { bigQuerySyncQueue } from '@/lib/queue'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Redis connection...')
    
    // Test Redis connection by getting queue stats
    const jobCounts = await bigQuerySyncQueue.getJobCounts()
    
    console.log('Redis connection successful! Job counts:', jobCounts)
    
    return NextResponse.json({
      success: true,
      message: 'Redis connection successful!',
      stats: jobCounts,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Redis connection test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Redis connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 