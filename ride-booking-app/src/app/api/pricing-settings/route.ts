import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settings.service'

// Public endpoint for pricing settings (no authentication required)
export async function GET(request: NextRequest) {
  try {
    // Get pricing settings without authentication
    const pricingSettings = await settingsService.getSettingsByCategory('pricing')
    
    // Convert to a simple object for easy consumption
    const settings: Record<string, any> = {}
    pricingSettings.forEach(setting => {
      settings[setting.key] = setting.actualValue
    })
    
    // Provide defaults if settings don't exist
    const defaultSettings = {
      rate_per_km: 20,
      minimum_fare: 50,
      use_simple_pricing: true,
      ...settings
    }
    
    return NextResponse.json({ success: true, data: defaultSettings })
  } catch (error) {
    console.error('Pricing settings fetch error:', error)
    
    // Return default settings if there's an error
    return NextResponse.json({
      success: true,
      data: {
        rate_per_km: 20,
        minimum_fare: 50,
        use_simple_pricing: true
      }
    })
  }
}