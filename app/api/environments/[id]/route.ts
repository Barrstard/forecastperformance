import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const environment = await prisma.environment.findUnique({
      where: { id: params.id }
    })

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(environment)
  } catch (error) {
    console.error('Failed to fetch environment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch environment' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { 
      name, 
      bigqueryProjectId, 
      bigqueryDataset, 
      bigqueryCredentials, 
      ukgProUrl, 
      ukgProClientId, 
      ukgProClientSecret, 
      ukgProAppKey, 
      ukgProUsername, 
      ukgProPassword, 
      isActive 
    } = body

    // Check if environment exists
    const existingEnvironment = await prisma.environment.findUnique({
      where: { id: params.id }
    })

    if (!existingEnvironment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      )
    }

    // Update environment
    const updatedEnvironment = await prisma.environment.update({
      where: { id: params.id },
      data: {
        name,
        bigqueryProjectId,
        bigqueryDataset,
        bigqueryCredentials,
        ukgProUrl,
        ukgProClientId,
        ukgProClientSecret,
        ukgProAppKey,
        ukgProUsername,
        ukgProPassword,
        isActive,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedEnvironment)
  } catch (error) {
    console.error('Failed to update environment:', error)
    return NextResponse.json(
      { error: 'Failed to update environment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if environment exists
    const existingEnvironment = await prisma.environment.findUnique({
      where: { id: params.id }
    })

    if (!existingEnvironment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      )
    }

    // Check if environment has associated forecast runs
    const forecastRuns = await prisma.forecastRun.findMany({
      where: { environmentId: params.id }
    })

    if (forecastRuns.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete environment with associated forecast runs' },
        { status: 400 }
      )
    }

    // Delete environment
    await prisma.environment.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete environment:', error)
    return NextResponse.json(
      { error: 'Failed to delete environment' },
      { status: 500 }
    )
  }
} 