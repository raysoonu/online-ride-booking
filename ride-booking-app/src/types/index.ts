import { User, Booking, Driver, PricingRule, Settings, EmailTemplate, AuditLog, UserRole, BookingStatus, PaymentStatus } from '@prisma/client'

export interface BookingFormData {
  name: string
  email: string
  phone: string
  pickupAddress: string
  dropoffAddress: string
  pickupDate: string
  pickupTime: string
  calculatedDistance?: number
  calculatedFare?: number
}

export interface Location {
  lat: number
  lng: number
  address: string
}

export interface RouteInfo {
  distance: {
    text: string
    value: number
  }
  duration: {
    text: string
    value: number
  }
  startAddress: string
  endAddress: string
}

// Database types
export type { Booking, Driver, PricingRule, Settings, EmailTemplate, AuditLog, UserRole, BookingStatus, PaymentStatus }
export type { User } from '@prisma/client'

// Extended types
export interface BookingWithDriver extends Booking {
  driver?: Driver | null
  user?: User | null
}

export interface DashboardStats {
  totalBookings: number
  todayBookings: number
  totalRevenue: number
  todayRevenue: number
  activeDrivers: number
  completedRides: number
  pendingBookings: number
  cancelledBookings: number
}

export interface PricingCalculation {
  baseFare: number
  distanceFare: number
  timeFare: number
  multiplier: number
  totalFare: number
  breakdown: {
    base: number
    distance: number
    time: number
    surge: number
  }
}

export interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  phone?: string
  password: string
}

export interface AdminSettings {
  googleMapsApiKey: string
  baseFare: number
  perMile: number
  minimumFare: number
  hourlyRate: number
  minHours: number
  formTitle: string
  primaryColor: string
  logo?: string
}

// User type is imported from Prisma client above

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}