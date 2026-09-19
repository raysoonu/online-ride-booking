'use client'

import { useState } from 'react'
import { X, Search, XCircle, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface CancelRideModalProps {
  isOpen: boolean
  onClose: () => void
  initialBookingNumber?: string
}

interface BookingPreview {
  id: string
  bookingNumber: string
  name: string
  email: string
  phone: string
  pickupAddress: string
  dropoffAddress: string
  pickupDate: string
  pickupTime: string
  fare: number
  status: string
}

export default function CancelRideModal({ isOpen, onClose, initialBookingNumber = '' }: CancelRideModalProps) {
  const [bookingNumber, setBookingNumber] = useState(initialBookingNumber)
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState<BookingPreview | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingNumber.trim()) {
      setSearchError('Please enter a booking number')
      return
    }

    setLoading(true)
    setSearchError(null)
    setActionSuccess(null)
    setActionError(null)

    try {
      const res = await fetch(`/api/booking-details?booking_number=${encodeURIComponent(bookingNumber.trim())}`)
      const data = await res.json()

      if (data.success && data.booking) {
        // Optional verification if emailOrPhone was entered
        if (emailOrPhone.trim()) {
          const cleanInput = emailOrPhone.trim().toLowerCase()
          const b = data.booking
          const matchesEmail = b.email.toLowerCase() === cleanInput
          const matchesPhone = b.phone.replace(/[^0-9]/g, '').includes(cleanInput.replace(/[^0-9]/g, ''))

          if (!matchesEmail && !matchesPhone) {
            setSearchError('Booking found, but the email/phone provided does not match.')
            setBooking(null)
            setLoading(false)
            return
          }
        }
        setBooking(data.booking)
      } else {
        setSearchError(data.message || 'No booking found with this number.')
        setBooking(null)
      }
    } catch (err) {
      setSearchError('An error occurred while fetching booking details.')
      setBooking(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!booking) return
    if (!confirm('Are you sure you want to cancel this ride?')) return

    setLoading(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingIdentifier: booking.bookingNumber || booking.id,
          emailOrPhone,
          reason,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setActionSuccess('Your ride has been successfully cancelled!')
        setBooking((prev: BookingPreview | null) => (prev ? { ...prev, status: 'CANCELLED' } : null))
      } else {
        setActionError(data.error || 'Failed to cancel the ride.')
      }
    } catch (err) {
      setActionError('Network error while cancelling ride. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <XCircle className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold">Track & Cancel Ride</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. RB-123456"
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Phone (For verification)
              </label>
              <input
                type="text"
                placeholder="Enter email or phone number"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Find Ride Details</span>
                </>
              )}
            </button>
          </form>

          {/* Search Error */}
          {searchError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Booking Details Preview */}
          {booking && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-900">Booking #{booking.bookingNumber}</h4>
                  <p className="text-xs text-gray-500">Customer: {booking.name}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
                    booking.status === 'CANCELLED'
                      ? 'bg-red-100 text-red-800'
                      : booking.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {booking.status}
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p>📍 <strong>Pickup:</strong> {booking.pickupAddress}</p>
                <p>🎯 <strong>Dropoff:</strong> {booking.dropoffAddress}</p>
                <p>📅 <strong>Scheduled:</strong> {booking.pickupDate} at {booking.pickupTime}</p>
                <p>💵 <strong>Fare:</strong> NPR {booking.fare}</p>
              </div>

              {/* Success / Error Action Notifications */}
              {actionSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Action Buttons */}
              {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                <div className="pt-2 space-y-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Reason for Cancellation (Optional):
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Change of plans">Change of plans</option>
                    <option value="Booked another transport">Booked another transport</option>
                    <option value="Incorrect date/time">Incorrect date/time</option>
                    <option value="Other">Other</option>
                  </select>

                  <button
                    onClick={handleCancelBooking}
                    disabled={loading}
                    className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Confirm Ride Cancellation</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
