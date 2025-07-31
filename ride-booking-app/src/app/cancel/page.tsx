'use client'

import Link from 'next/link'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Cancel Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>

        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Booking Cancelled</h1>
        <p className="text-gray-600 mb-8">
          Your booking was cancelled and no payment was processed. 
          You can try booking again or contact us if you need assistance.
        </p>

        {/* Reasons */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left">
          <h3 className="font-semibold text-gray-900 mb-2">Common reasons for cancellation:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Payment method declined</li>
            <li>• Browser closed during payment</li>
            <li>• Clicked back or cancel button</li>
            <li>• Session timeout</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Booking Again</span>
          </Link>
          
          <Link
            href="/contact"
            className="w-full inline-flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            <span>Contact Support</span>
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help? Contact us at{' '}
            <a href="mailto:support@ridebooking.com" className="text-blue-600 hover:text-blue-700">
              support@ridebooking.com
            </a>{' '}
            or call{' '}
            <a href="tel:+1234567890" className="text-blue-600 hover:text-blue-700">
              (123) 456-7890
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}