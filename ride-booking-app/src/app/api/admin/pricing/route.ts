import { NextRequest, NextResponse } from 'next/server'
import { PricingService } from '@/lib/services/pricing.service'
import { AuthService } from '@/lib/services/auth.service'
import { UserRole } from '@prisma/client'

// Middleware to check admin authentication
async function checkAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  const user = await AuthService.verifyToken(token)
  
  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
    return null
  }
  
  return user
}

// GET /api/admin/pricing - Get all pricing rules
export async function GET(request: NextRequest) {
  try {
    const user = await checkAdminAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const active = searchParams.get('active')
    
    const result = await PricingService.getAllPricingRules({
      page,
      limit,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching pricing rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/pricing - Create a new pricing rule
export async function POST(request: NextRequest) {
  try {
    const user = await checkAdminAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const {
      name,
      baseFare,
      perMileRate: perMile,
      perMinute,
      minimumFare,
      peakHourMultiplier,
      weekendMultiplier,
      peakHours,
      isActive,
    } = body
    
    // Validate required fields
    if (!name || baseFare === undefined || perMile === undefined || minimumFare === undefined) {
      return NextResponse.json(
        { error: 'Name, base fare, per mile rate, and minimum fare are required' },
        { status: 400 }
      )
    }
    
    const pricingRule = await PricingService.createPricingRule({
      name,
      baseFare,
      perMileRate: perMile,
      perMinuteRate: perMinute || 0,
      minimumFare,
      peakHourMultiplier: peakHourMultiplier || 1,
      weekendMultiplier: weekendMultiplier || 1,


    })
    
    return NextResponse.json(pricingRule, { status: 201 })
  } catch (error) {
    console.error('Error creating pricing rule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/pricing - Update a pricing rule
export async function PUT(request: NextRequest) {
  try {
    const user = await checkAdminAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Pricing rule ID is required' },
        { status: 400 }
      )
    }
    
    const pricingRule = await PricingService.updatePricingRule(id, updateData)
    
    return NextResponse.json(pricingRule)
  } catch (error) {
    console.error('Error updating pricing rule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/pricing - Delete a pricing rule
export async function DELETE(request: NextRequest) {
  try {
    const user = await checkAdminAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Pricing rule ID is required' },
        { status: 400 }
      )
    }
    
    await PricingService.deletePricingRule(id)
    
    return NextResponse.json({ message: 'Pricing rule deleted successfully' })
  } catch (error) {
    console.error('Error deleting pricing rule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}