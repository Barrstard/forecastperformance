import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UKGProService } from '@/lib/dimensions-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const environmentId = searchParams.get('environmentId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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

    // Get batch job statistics
    const stats = await ukgProService.getBatchJobStats({
      start: startDate || undefined,
      end: endDate || undefined
    })

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error: any) {
    console.error('Failed to fetch batch job statistics:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch batch job statistics' 
      },
      { status: 500 }
    )
  }
} 