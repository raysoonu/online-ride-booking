import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'
import { EmailService } from '@/lib/services/email.service'
import { UserRole } from '@prisma/client'

// POST /api/admin/auth - Admin login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, password, name, phone } = body
    
    if (action === 'login') {
      // Admin login
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        )
      }
      
      const result = await AuthService.login({ email, password })
      
      // Check if user has admin privileges
      if (result.user.role !== UserRole.ADMIN && result.user.role !== UserRole.SUPER_ADMIN) {
        return NextResponse.json(
          { error: 'Access denied. Admin privileges required.' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(result)
    } else if (action === 'register') {
      // Admin registration (only for super admin or initial setup)
      if (!email || !password || !name) {
        return NextResponse.json(
          { error: 'Name, email, and password are required' },
          { status: 400 }
        )
      }
      
      // Check if this is the first admin (initial setup)
      const existingAdmins = await AuthService.getAllUsers({
        role: UserRole.ADMIN,
        limit: 1,
      })
      
      const existingSuperAdmins = await AuthService.getAllUsers({
        role: UserRole.SUPER_ADMIN,
        limit: 1,
      })
      
      const isInitialSetup = existingAdmins.total === 0 && existingSuperAdmins.total === 0
      
      if (!isInitialSetup) {
        // For non-initial setup, require super admin authentication
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json(
            { error: 'Unauthorized. Super admin access required.' },
            { status: 401 }
          )
        }
        
        const token = authHeader.substring(7)
        const currentUser = await AuthService.verifyToken(token)
        
        if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
          return NextResponse.json(
            { error: 'Unauthorized. Super admin access required.' },
            { status: 401 }
          )
        }
      }
      
      // Create admin user
      const role = isInitialSetup ? UserRole.SUPER_ADMIN : UserRole.ADMIN
      const admin = await AuthService.createAdmin({
        name,
        email,
        password,
        role,
      })
      
      // Send welcome email
      try {
        await EmailService.sendWelcomeEmail(admin)
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
      }
      
      return NextResponse.json(
        { 
          message: 'Admin created successfully',
          admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
          }
        },
        { status: 201 }
      )
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Auth error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/admin/auth - Verify admin token
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    const user = await AuthService.verifyToken(token)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Check if user has admin privileges
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}