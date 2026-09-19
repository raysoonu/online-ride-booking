import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { EmailService } from '@/lib/services/email.service'
import { EsewaService } from '@/lib/services/esewa.service'
import { BookingStatus, PaymentStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const dataBase64 = searchParams.get('data')
  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin

  if (!dataBase64) {
    return NextResponse.redirect(`${baseUrl}/cancel?error=missing_data`)
  }

  const { isValid, decoded } = EsewaService.decodeAndVerifyResponse(dataBase64)

  if (!isValid || !decoded || !decoded.transaction_uuid) {
    return NextResponse.redirect(`${baseUrl}/cancel?error=invalid_esewa_response`)
  }

  // Extract bookingNumber from transaction_uuid (e.g. "RB123456ABCD_1726739000123")
  const rawUuid = decoded.transaction_uuid
  const bookingNumber = rawUuid.includes('_') ? rawUuid.split('_')[0] : rawUuid.split('-')[0]

  try {
    let booking = await BookingService.getBookingByNumber(bookingNumber)
    if (!booking) {
      booking = await BookingService.getBookingByNumber(rawUuid)
    }
    if (!booking) {
      booking = await BookingService.getBookingById(bookingNumber)
    }

    if (!booking) {
      console.error(`eSewa success callback: Booking not found for '${bookingNumber}' (raw: '${rawUuid}')`)
      return NextResponse.redirect(`${baseUrl}/cancel?error=booking_not_found`)
    }

    // Update payment & booking status
    await BookingService.updatePaymentStatus(booking.id, PaymentStatus.PAID)
    await BookingService.updateBookingStatus(booking.id, BookingStatus.CONFIRMED)

    // Send confirmation email
    try {
      await EmailService.sendBookingConfirmation({
        customerEmail: booking.customerEmail,
        customerName: booking.customerName,
        bookingNumber: booking.bookingNumber,
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        pickupDate: booking.pickupDate.toISOString().split('T')[0],
        pickupTime: booking.pickupTime,
        fare: booking.estimatedFare,
      })
    } catch (emailError) {
      console.error('Email confirmation error:', emailError)
    }

    return NextResponse.redirect(`${baseUrl}/success?booking_number=${booking.bookingNumber}&payment=esewa`)
  } catch (error) {
    console.error('Error processing eSewa success callback:', error)
    return NextResponse.redirect(`${baseUrl}/cancel?error=server_error`)
  }
}
