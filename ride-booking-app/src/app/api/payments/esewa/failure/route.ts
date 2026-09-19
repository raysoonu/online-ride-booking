import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin
  return NextResponse.redirect(`${baseUrl}/cancel?error=esewa_payment_failed`)
}
