import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { AuthService } from '@/lib/services/auth.service'
import { EmailService } from '@/lib/services/email.service'
import { BookingStatus, PaymentStatus, UserRole } from '@prisma/client'

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

// GET /api/admin/bookings - Get all bookings with pagination and filters
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
    const status = searchParams.get('status') as BookingStatus | null
    const paymentStatus = searchParams.get('paymentStatus') as PaymentStatus | null
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const result = await BookingService.getAllBookings({
      page,
      limit,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      search: search || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/bookings - Delete a booking
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
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }
    
    // Check if booking exists
    const booking = await BookingService.getBookingById(id)
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    
    // Delete the booking
    await BookingService.deleteBooking(id)
    
    return NextResponse.json(
      { message: 'Booking deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/bookings - Create a new booking (admin only)
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
    const booking = await BookingService.createBooking(body)
    
    // Send confirmation email
    try {
      await EmailService.sendBookingConfirmation(booking)
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
    }
    
    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/bookings - Update booking status
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
    const { id, status, paymentStatus, driverId } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }
    
    // Get current booking for comparison
    const currentBooking = await BookingService.getBookingById(id)
    if (!currentBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    
    const oldStatus = currentBooking.status
    
    // Update booking status and payment status
    if (status) {
      await BookingService.updateBookingStatus(id, status)
    }
    if (paymentStatus) {
      await BookingService.updatePaymentStatus(id, paymentStatus)
    }
    
    // Get updated booking
    const updatedBooking = await BookingService.getBookingById(id)
    
    // Assign driver if provided
    if (driverId) {
      await BookingService.assignDriver(id, driverId)
    }
    
    // Send status update email if status changed
    if (status && status !== oldStatus) {
      try {
        await EmailService.sendBookingStatusUpdate(updatedBooking, oldStatus)
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError)
      }
    }
    
    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}