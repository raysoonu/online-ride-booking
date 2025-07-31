import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { PricingService } from '@/lib/services/pricing.service'
import { EmailService } from '@/lib/services/email.service'
import { generateBookingNumber } from '@/lib/utils'
import { BookingStatus, PaymentStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerName,
      customerEmail,
      customerPhone,
      pickupAddress,
      dropoffAddress,
      pickupDate,
      pickupTime,
      distance,
      duration,
    } = body

    // Validate required fields
    if (!customerName || !customerEmail || !customerPhone || !pickupAddress || !dropoffAddress || !pickupDate || !pickupTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate fare using pricing service
    const distanceInMiles = distance ? distance / 1609.34 : 0
    const durationInMinutes = duration ? duration / 60 : 0
    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`)
    
    const fareCalculation = await PricingService.calculateFare(
      distanceInMiles,
      durationInMinutes,
      pickupDateTime
    )

    // Generate booking number
    const bookingNumber = generateBookingNumber()

    // Create booking in database
    const booking = await BookingService.createBooking({
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      pickupAddress,
      dropoffAddress,
      pickupDate,
      pickupTime,
      distance: distanceInMiles,
      duration: durationInMinutes,
      estimatedFare: fareCalculation.totalFare,
    })

    // Update booking status to confirmed and payment to completed
    await BookingService.updateBookingStatus(booking.id, BookingStatus.CONFIRMED)
    await BookingService.updatePaymentStatus(booking.id, PaymentStatus.PAID)

    // Send confirmation email
    try {
      await EmailService.sendBookingConfirmation({
        customerEmail: booking.customerEmail,
        customerName: booking.customerName,
        bookingNumber: booking.bookingNumber,
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        pickupDate: booking.pickupDate,
        pickupTime: booking.pickupTime,
        fare: booking.estimatedFare,
      })
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Don't fail the booking if email fails
    }

    return NextResponse.json({ 
      success: true,
      bookingNumber: booking.bookingNumber,
      fare: fareCalculation.totalFare,
      fareBreakdown: fareCalculation,
      message: 'Booking confirmed successfully!'
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}