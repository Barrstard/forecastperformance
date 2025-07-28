import { NextRequest, NextResponse } from 'next/server'
import { UKGProService } from '@/lib/dimensions-api'

export async function POST(request: NextRequest) {
  try {
    const { 
      url, 
      clientId, 
      clientSecret, 
      appKey, 
      username, 
      password 
    } = await request.json()

    // Validate required fields
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'UKG Pro URL is required' },
        { status: 400 }
      )
    }

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      )
    }

    if (!clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Client Secret is required' },
        { status: 400 }
      )
    }

    if (!appKey) {
      return NextResponse.json(
        { success: false, error: 'App Key is required' },
        { status: 400 }
      )
    }

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      )
    }

    // Test connection
    const ukgProService = new UKGProService({
      url,
      clientId,
      clientSecret,
      appKey,
      username,
      password
    })
    
    const result = await ukgProService.testConnection()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'UKG Pro connection successful',
        tenantInfo: result.tenantInfo
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to connect to UKG Pro'
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('UKG Pro connection error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test UKG Pro connection'
    }, { status: 500 })
  }
} 