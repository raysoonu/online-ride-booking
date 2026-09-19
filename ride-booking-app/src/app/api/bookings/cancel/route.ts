import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { EmailService } from '@/lib/services/email.service'
import { BookingStatus, PaymentStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingIdentifier, emailOrPhone, reason } = body

    if (!bookingIdentifier) {
      return NextResponse.json(
        { error: 'Booking number or ID is required' },
        { status: 400 }
      )
    }

    // Lookup booking by ID or Booking Number
    let booking = await BookingService.getBookingByNumber(bookingIdentifier)
    if (!booking) {
      booking = await BookingService.getBookingById(bookingIdentifier)
    }

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found with the provided details' },
        { status: 404 }
      )
    }

    // Optional verification if emailOrPhone is supplied
    if (emailOrPhone) {
      const cleanInput = emailOrPhone.trim().toLowerCase()
      const matchesEmail = booking.customerEmail.toLowerCase() === cleanInput
      const matchesPhone = booking.customerPhone.replace(/[^0-9]/g, '').includes(cleanInput.replace(/[^0-9]/g, ''))

      if (!matchesEmail && !matchesPhone) {
        return NextResponse.json(
          { error: 'The email or phone number provided does not match this booking' },
          { status: 403 }
        )
      }
    }

    // Check status eligibility
    if (booking.status === BookingStatus.CANCELLED) {
      return NextResponse.json(
        { error: 'This booking has already been cancelled' },
        { status: 400 }
      )
    }

    if (booking.status === BookingStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Cannot cancel a ride that has already been completed' },
        { status: 400 }
      )
    }

    const oldStatus = booking.status
    if (reason) {
      console.log(`Booking ${booking.bookingNumber} cancellation reason: ${reason}`)
    }

    // Update booking status to CANCELLED
    const updatedBooking = await BookingService.updateBookingStatus(booking.id, BookingStatus.CANCELLED)

    // Update payment status to REFUNDED if paid, or CANCELLED
    const newPaymentStatus = booking.paymentStatus === PaymentStatus.PAID 
      ? PaymentStatus.REFUNDED 
      : PaymentStatus.FAILED
    await BookingService.updatePaymentStatus(booking.id, newPaymentStatus)

    // Send email notification
    try {
      await EmailService.sendBookingStatusUpdate(booking, oldStatus)
    } catch (emailErr) {
      console.error('Failed to send status update email on cancellation:', emailErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Your booking has been cancelled successfully.',
      booking: {
        id: updatedBooking.id,
        bookingNumber: updatedBooking.bookingNumber,
        status: updatedBooking.status,
      }
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your cancellation request' },
      { status: 500 }
    )
  }
}
