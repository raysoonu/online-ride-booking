import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settings.service'
import { verifyAdminToken } from '@/lib/services/auth.service'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow SUPER_ADMIN to initialize settings
    if (authResult.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only super admin can initialize settings' }, { status: 403 })
    }

    await settingsService.initializeDefaultSettings()

    return NextResponse.json({ 
      success: true, 
      message: 'Default settings initialized successfully' 
    })
  } catch (error) {
    console.error('Settings initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize settings' },
      { status: 500 }
    )
  }
}