import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BigQueryService } from '@/lib/bigquery'
import { UKGProService } from '@/lib/dimensions-api'

export async function GET() {
  try {
    const environments = await prisma.environment.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(environments)
  } catch (error: any) {
    console.error('Failed to fetch environments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch environments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      bigqueryCredentials,
      bigqueryDataset,
      ukgProUrl,
      ukgProClientId,
      ukgProClientSecret,
      ukgProAppKey,
      ukgProUsername,
      ukgProPassword
    } = await request.json()

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Environment name is required' },
        { status: 400 }
      )
    }

    if (!bigqueryCredentials) {
      return NextResponse.json(
        { error: 'BigQuery credentials are required' },
        { status: 400 }
      )
    }

    // Test BigQuery connection
    const bigQueryService = new BigQueryService()
    const bigQueryResult = await bigQueryService.connectWithCredentials(
      bigqueryCredentials,
      bigqueryDataset
    )

    if (!bigQueryResult.success) {
      return NextResponse.json(
        { error: `BigQuery connection failed: ${bigQueryResult.error}` },
        { status: 400 }
      )
    }

    // Test UKG Pro connection if provided
    if (ukgProUrl && ukgProClientId && ukgProClientSecret && ukgProAppKey && ukgProUsername && ukgProPassword) {
      const ukgProService = new UKGProService({
        url: ukgProUrl,
        clientId: ukgProClientId,
        clientSecret: ukgProClientSecret,
        appKey: ukgProAppKey,
        username: ukgProUsername,
        password: ukgProPassword
      })
      const ukgProResult = await ukgProService.testConnection()

      if (!ukgProResult.success) {
        return NextResponse.json(
          { error: `UKG Pro connection failed: ${ukgProResult.error}` },
          { status: 400 }
        )
      }
    }

    // Create environment
    const environment = await prisma.environment.create({
      data: {
        name,
        bigqueryProjectId: bigQueryService.getProjectId(),
        bigqueryDataset: bigQueryService.getDataset(),
        bigqueryCredentials: bigqueryCredentials,
        ukgProUrl: ukgProUrl || null,
        ukgProClientId: ukgProClientId || null,
        ukgProClientSecret: ukgProClientSecret || null,
        ukgProAppKey: ukgProAppKey || null,
        ukgProUsername: ukgProUsername || null,
        ukgProPassword: ukgProPassword || null
      }
    })

    return NextResponse.json(environment)
  } catch (error: any) {
    console.error('Failed to create environment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create environment' },
      { status: 500 }
    )
  }
} 