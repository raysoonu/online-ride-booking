import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { PricingService } from '@/lib/services/pricing.service'
import { EsewaService } from '@/lib/services/esewa.service'

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

    if (!customerName || !customerEmail || !customerPhone || !pickupAddress || !dropoffAddress || !pickupDate || !pickupTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const distanceMeters = distance ? Number(distance) : 0
    const durationSeconds = duration ? Number(duration) : 0
    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`)

    const fareCalculation = await PricingService.calculateFare(
      distanceMeters,
      durationSeconds,
      pickupDateTime
    )

    const finalFare = Number(fareCalculation.totalFare.toFixed(2))

    // Create booking in database with PENDING status
    const booking = await BookingService.createBooking({
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      pickupAddress,
      dropoffAddress,
      pickupDate,
      pickupTime,
      distance: distanceMeters / 1609.34,
      duration: durationSeconds / 60,
      estimatedFare: finalFare,
    })

    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin

    // Prepare eSewa payment payload
    const { payload, gatewayUrl } = EsewaService.preparePaymentPayload({
      amount: fareCalculation.totalFare,
      bookingNumber: booking.bookingNumber,
      baseUrl,
    })

    return NextResponse.json({
      success: true,
      bookingNumber: booking.bookingNumber,
      bookingId: booking.id,
      amount: fareCalculation.totalFare,
      payload,
      gatewayUrl,
    })
  } catch (error) {
    console.error('Error initiating eSewa payment:', error)
    return NextResponse.json(
      { error: 'Failed to initiate eSewa payment' },
      { status: 500 }
    )
  }
}
