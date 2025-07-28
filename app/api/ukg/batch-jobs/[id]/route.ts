import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UKGProService } from '@/lib/dimensions-api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const environmentId = searchParams.get('environmentId')

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

    // Get batch job details
    const batchJob = await ukgProService.getBatchJob(params.id)

    return NextResponse.json({
      success: true,
      batchJob
    })

  } catch (error: any) {
    console.error(`Failed to fetch batch job ${params.id}:`, error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch batch job' 
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { environmentId, status, metadata } = body

    if (!environmentId) {
      return NextResponse.json(
        { error: 'Environment ID is required' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
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

    // Update batch job status
    const updatedJob = await ukgProService.updateBatchJobStatus(
      params.id,
      status,
      metadata
    )

    return NextResponse.json({
      success: true,
      batchJob: updatedJob,
      message: 'Batch job status updated successfully'
    })

  } catch (error: any) {
    console.error(`Failed to update batch job ${params.id}:`, error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update batch job' 
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { environmentId, action } = body

    if (!environmentId) {
      return NextResponse.json(
        { error: 'Environment ID is required' },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
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

    let result: any

    // Perform action based on the action parameter
    switch (action) {
      case 'cancel':
        result = await ukgProService.cancelBatchJob(params.id)
        break
      
      case 'pause':
        result = await ukgProService.pauseBatchJob(params.id)
        break
      
      case 'resume':
        result = await ukgProService.resumeBatchJob(params.id)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: cancel, pause, resume' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Batch job ${action} operation completed successfully`
    })

  } catch (error: any) {
    console.error(`Failed to perform action on batch job ${params.id}:`, error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to perform action on batch job' 
      },
      { status: 500 }
    )
  }
} 