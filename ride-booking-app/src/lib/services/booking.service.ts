import { prisma } from '@/lib/prisma'
import { BookingFormData, BookingWithDriver, PricingCalculation } from '@/types'
import { BookingStatus, PaymentStatus } from '@prisma/client'
import { generateBookingNumber } from '@/lib/utils'

export class BookingService {
  static async createBooking(data: BookingFormData & {
    distance: number
    duration: number
    estimatedFare: number
  }) {
    const bookingNumber = generateBookingNumber()
    
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: data.phone,
        pickupAddress: data.pickupAddress,
        dropoffAddress: data.dropoffAddress,
        pickupDate: new Date(`${data.pickupDate}T${data.pickupTime}`),
        pickupTime: data.pickupTime,
        distance: data.distance,
        duration: data.duration,
        estimatedFare: data.estimatedFare,

        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      },
    })
    
    return booking
  }
  
  static async getBookingById(id: string): Promise<BookingWithDriver | null> {
    return await prisma.booking.findUnique({
      where: { id },
      include: {
        driver: true,
        user: true,
      },
    })
  }
  
  static async getBookingByNumber(bookingNumber: string): Promise<BookingWithDriver | null> {
    return await prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        driver: true,
        user: true,
      },
    })
  }
  

  
  static async updateBookingStatus(id: string, status: BookingStatus) {
    return await prisma.booking.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date(),
        ...(status === BookingStatus.COMPLETED && { completedAt: new Date() })
      },
    })
  }
  
  static async updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
    return await prisma.booking.update({
      where: { id },
      data: { 
        paymentStatus,
        updatedAt: new Date(),
        ...(paymentStatus === PaymentStatus.PAID && { status: BookingStatus.CONFIRMED })
      },
    })
  }
  
  static async assignDriver(bookingId: string, driverId: string) {
    return await prisma.booking.update({
      where: { id: bookingId },
      data: {
        driverId,
        assignedAt: new Date(),
        status: BookingStatus.ASSIGNED,
        updatedAt: new Date(),
      },
    })
  }
  
  static async getAllBookings({
    page = 1,
    limit = 10,
    status,
    paymentStatus,
    search,
    startDate,
    endDate,
  }: {
    page?: number
    limit?: number
    status?: BookingStatus
    paymentStatus?: PaymentStatus
    search?: string
    startDate?: Date
    endDate?: Date
  } = {}) {
    const skip = (page - 1) * limit
    
    const where = {
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
      ...(search && {
        OR: [
          { customerName: { contains: search, mode: 'insensitive' as const } },
          { customerEmail: { contains: search, mode: 'insensitive' as const } },
          { bookingNumber: { contains: search, mode: 'insensitive' as const } },
          { pickupAddress: { contains: search, mode: 'insensitive' as const } },
          { dropoffAddress: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          driver: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ])
    
    return {
      bookings,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    }
  }
  
  static async getTodayBookings() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    return await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        driver: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }
  
  static async getBookingStats({
    startDate,
    endDate,
  }: {
    startDate?: Date
    endDate?: Date
  } = {}) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    } : {}

    const todayFilter = {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    }

    const [totalBookings, todayBookings, totalRevenue, todayRevenue, completedRides, pendingBookings, cancelledBookings] = await Promise.all([
      prisma.booking.count({
        where: dateFilter,
      }),
      prisma.booking.count({
        where: todayFilter,
      }),
      prisma.booking.aggregate({
        where: {
          paymentStatus: PaymentStatus.PAID,
          ...dateFilter,
        },
        _sum: {
          estimatedFare: true,
        },
      }),
      prisma.booking.aggregate({
        where: {
          paymentStatus: PaymentStatus.PAID,
          ...todayFilter,
        },
        _sum: {
          estimatedFare: true,
        },
      }),
      prisma.booking.count({
        where: {
          status: BookingStatus.COMPLETED,
        },
      }),
      prisma.booking.count({
        where: {
          status: BookingStatus.PENDING,
        },
      }),
      prisma.booking.count({
        where: {
          status: BookingStatus.CANCELLED,
        },
      }),
    ])
    
    return {
      totalBookings,
      todayBookings,
      totalRevenue: totalRevenue._sum.estimatedFare || 0,
      todayRevenue: todayRevenue._sum.estimatedFare || 0,
      completedRides,
      pendingBookings,
      cancelledBookings,
    }
  }

  static async deleteBooking(id: string) {
    return await prisma.booking.delete({
      where: {
        id,
      },
    })
  }
}