import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UKGProService } from '@/lib/dimensions-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const environmentId = searchParams.get('environmentId')
    const status = searchParams.get('status')?.split(',')
    const jobType = searchParams.get('jobType')?.split(',')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
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

    // Get batch job history
    const result = await ukgProService.getBatchJobHistory({
      status,
      jobType,
      startDate,
      endDate,
      createdBy,
      limit,
      offset
    })

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error: any) {
    console.error('Failed to fetch batch job history:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch batch job history' 
      },
      { status: 500 }
    )
  }
} 