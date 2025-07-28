import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UKGProService } from '@/lib/dimensions-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const environmentId = searchParams.get('environmentId')
    const status = searchParams.get('status')?.split(',')
    const jobType = searchParams.get('jobType')?.split(',')
    const createdBy = searchParams.get('createdBy')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!environmentId) {
      return NextResponse.json(
        { error: 'Environment ID is required' },
        { status: 400 }
      )
    }

    // Get environment configuration
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId }
    })

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      )
    }

    if (!environment.ukgProUrl || !environment.ukgProClientId) {
      return NextResponse.json(
        { error: 'UKG Pro credentials not configured for this environment' },
        { status: 400 }
      )
    }

    // Initialize UKG Pro service
    const ukgProService = new UKGProService({
      url: environment.ukgProUrl,
      clientId: environment.ukgProClientId,
      clientSecret: environment.ukgProClientSecret!,
      appKey: environment.ukgProAppKey!,
      username: environment.ukgProUsername!,
      password: environment.ukgProPassword!
    })

    // Get current batch jobs
    const result = await ukgProService.getCurrentBatchJobs({
      status,
      jobType,
      createdBy,
      limit,
      offset
    })

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error: any) {
    console.error('Failed to fetch batch jobs:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch batch jobs' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      environmentId,
      name,
      description,
      jobType,
      priority,
      metadata
    } = body

    // Validate required fields
    if (!environmentId || !name || !jobType) {
      return NextResponse.json(
        { error: 'Environment ID, name, and job type are required' },
        { status: 400 }
      )
    }

    // Get environment configuration
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId }
    })

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      )
    }

    if (!environment.ukgProUrl || !environment.ukgProClientId) {
      return NextResponse.json(
        { error: 'UKG Pro credentials not configured for this environment' },
        { status: 400 }
      )
    }

    // Initialize UKG Pro service
    const ukgProService = new UKGProService({
      url: environment.ukgProUrl,
      clientId: environment.ukgProClientId,
      clientSecret: environment.ukgProClientSecret!,
      appKey: environment.ukgProAppKey!,
      username: environment.ukgProUsername!,
      password: environment.ukgProPassword!
    })

    // Create batch job
    const batchJob = await ukgProService.createBatchJob({
      name,
      description,
      jobType,
      priority,
      metadata
    })

    return NextResponse.json({
      success: true,
      batchJob,
      message: 'Batch job created successfully'
    })

  } catch (error: any) {
    console.error('Failed to create batch job:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create batch job' 
      },
      { status: 500 }
    )
  }
} 