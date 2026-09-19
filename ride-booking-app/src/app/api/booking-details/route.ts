import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const bookingNumber = searchParams.get('booking_number')
    const bookingId = searchParams.get('booking_id') || searchParams.get('session_id')

    let booking = null

    if (bookingNumber) {
      booking = await BookingService.getBookingByNumber(bookingNumber)
    } else if (bookingId) {
      booking = await BookingService.getBookingById(bookingId)
      if (!booking) {
        booking = await BookingService.getBookingByNumber(bookingId)
      }
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        name: booking.customerName,
        email: booking.customerEmail,
        phone: booking.customerPhone,
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        pickupDate: booking.pickupDate.toISOString().split('T')[0],
        pickupTime: booking.pickupTime,
        distance: booking.distance * 1609.34, // return meters for component calculations
        fare: booking.estimatedFare,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        driver: booking.driver ? {
          name: booking.driver.name,
          phone: booking.driver.phone,
          vehicleModel: booking.driver.vehicleModel,
          vehiclePlate: booking.driver.vehiclePlate,
        } : null,
      },
    })
  } catch (error) {
    console.error('Error fetching booking details:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
