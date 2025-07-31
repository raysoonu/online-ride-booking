import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settings.service'
import { verifyAdminToken } from '@/lib/services/auth.service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let settings
    if (category) {
      settings = await settingsService.getSettingsByCategory(category)
    } else {
      settings = await settingsService.getAllSettings()
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key, value, description, category, isEncrypted, isSensitive, dataType } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    await settingsService.setSetting({
      key,
      value,
      description,
      category: category || 'general',
      isEncrypted: isEncrypted || false,
      isSensitive: isSensitive || false,
      dataType: dataType || 'string'
    })

    return NextResponse.json({ success: true, message: 'Setting saved successfully' })
  } catch (error) {
    console.error('Settings save error:', error)
    return NextResponse.json(
      { error: 'Failed to save setting' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { settings } = body

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings must be an array' },
        { status: 400 }
      )
    }

    // Update multiple settings
    for (const setting of settings) {
      if (setting.key && setting.value !== undefined) {
        await settingsService.setSetting(setting)
      }
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Settings bulk update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      )
    }

    await settingsService.deleteSetting(key)

    return NextResponse.json({ success: true, message: 'Setting deleted successfully' })
  } catch (error) {
    console.error('Settings delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    )
  }
}