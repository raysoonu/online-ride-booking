import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/services/booking.service'
import { AuthService } from '@/lib/services/auth.service'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Middleware to check admin authentication
async function checkAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  const user = await AuthService.verifyToken(token)
  
  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
    return null
  }
  
  return user
}

// GET /api/admin/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const user = await checkAdminAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))
    
    // Get basic statistics
    const stats = await BookingService.getBookingStats({
      startDate,
      endDate: new Date(),
    })
    
    // Get recent bookings
    const recentBookings = await BookingService.getAllBookings({
      page: 1,
      limit: 10,
      startDate,
    })
    
    // Get revenue by day for the chart
    const revenueByDay = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        SUM(fare) as revenue,
        COUNT(*) as bookings
      FROM "Booking" 
      WHERE "createdAt" >= ${startDate}
        AND "paymentStatus" = 'COMPLETED'
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 30
    `
    
    // Get top pickup locations
    const topPickupLocations = await prisma.$queryRaw`
      SELECT 
        "pickupAddress",
        COUNT(*) as count
      FROM "Booking" 
      WHERE "createdAt" >= ${startDate}
      GROUP BY "pickupAddress"
      ORDER BY count DESC
      LIMIT 10
    `
    
    // Get booking status distribution
    const statusDistribution = await prisma.booking.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        status: true,
      },
    })
    
    // Get payment status distribution
    const paymentStatusDistribution = await prisma.booking.groupBy({
      by: ['paymentStatus'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        paymentStatus: true,
      },
    })
    
    // Get user growth
    const userGrowth = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as newUsers
      FROM "User" 
      WHERE "createdAt" >= ${startDate}
        AND role = 'CUSTOMER'
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 30
    `
    
    // Get driver statistics
    const driverStats = await prisma.driver.aggregate({
      _count: {
        id: true,
      },
      where: {
        isActive: true,
      },
    })
    
    const busyDrivers = await prisma.$queryRaw`
      SELECT 
        d.name,
        d.phone,
        COUNT(b.id) as activeBookings
      FROM "Driver" d
      LEFT JOIN "Booking" b ON d.id = b."driverId" 
        AND b.status IN ('CONFIRMED', 'IN_PROGRESS')
      WHERE d."isActive" = true
      GROUP BY d.id, d.name, d.phone
      ORDER BY activeBookings DESC
      LIMIT 10
    `
    
    const dashboardData = {
      stats: {
        totalBookings: stats.totalBookings,
        totalRevenue: stats.totalRevenue,
        completedRides: stats.completedRides,
        pendingBookings: stats.pendingBookings,
        cancelledBookings: stats.cancelledBookings,
        totalCustomers: await prisma.user.count({
          where: { role: UserRole.CUSTOMER },
        }),
        activeDrivers: driverStats._count.id,
      },
      charts: {
        revenueByDay: Array.isArray(revenueByDay) ? revenueByDay : [],
        statusDistribution: statusDistribution.map(item => ({
          status: item.status,
          count: item._count.status,
        })),
        paymentStatusDistribution: paymentStatusDistribution.map(item => ({
          status: item.paymentStatus,
          count: item._count.paymentStatus,
        })),
        userGrowth: Array.isArray(userGrowth) ? userGrowth : [],
      },
      recentBookings: recentBookings.bookings,
      topPickupLocations: Array.isArray(topPickupLocations) ? topPickupLocations : [],
      busyDrivers: Array.isArray(busyDrivers) ? busyDrivers : [],
      period: parseInt(period),
    }
    
    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}