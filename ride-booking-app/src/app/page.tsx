'use client'

import { useState } from 'react'
import BookingForm from '@/components/BookingForm'
import CancelRideModal from '@/components/CancelRideModal'
import { Car, Shield, Clock, Star, XCircle } from 'lucide-react'

export default function Home() {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">RideBooking</h1>
            </div>
            <nav className="flex items-center space-x-6">
              <a href="#" className="hidden md:inline text-gray-600 hover:text-gray-900 font-medium">Home</a>
              <a href="#" className="hidden md:inline text-gray-600 hover:text-gray-900 font-medium">Services</a>
              <a href="#" className="hidden md:inline text-gray-600 hover:text-gray-900 font-medium">Contact</a>
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="flex items-center space-x-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-4 py-2 rounded-lg border border-red-200 transition text-sm"
              >
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Track / Cancel Ride</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Professional Ride Booking
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Book your ride with upfront pricing, professional drivers, and reliable service. 
              No surge pricing, no hidden fees.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Safe & Secure</h3>
              <p className="text-gray-600 text-sm">Licensed drivers and secure payments</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">On Time</h3>
              <p className="text-gray-600 text-sm">Punctual service you can rely on</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Top Rated</h3>
              <p className="text-gray-600 text-sm">5-star service from our customers</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Premium Fleet</h3>
              <p className="text-gray-600 text-sm">Clean, comfortable vehicles</p>
            </div>
          </div>

          {/* Booking Form */}
          <BookingForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Car className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold">RideBooking</span>
              </div>
              <p className="text-gray-400">
                Professional transportation service with upfront pricing and reliable drivers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Airport Transfers</li>
                <li>City Rides</li>
                <li>Hourly Service</li>
                <li>Corporate Travel</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Terms of Service</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Phone: 9809619447</li>
                <li>Email: support@ridebooking.com</li>
                <li>24/7 Customer Service</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 RideBooking. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <CancelRideModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
      />
    </div>
  )
}
