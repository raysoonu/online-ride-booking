import { prisma } from '@/lib/prisma'
import { PricingCalculation } from '@/types'

export class PricingService {
  static async getActivePricingRule() {
    const now = new Date()
    
    return await prisma.pricingRule.findFirst({
      where: {
        isActive: true,
        OR: [
          {
            validFrom: null,
            validTo: null,
          },
          {
            validFrom: { lte: now },
            validTo: { gte: now },
          },
          {
            validFrom: { lte: now },
            validTo: null,
          },
          {
            validFrom: null,
            validTo: { gte: now },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })
  }
  
  static async calculateFare(
    distanceInMeters: number,
    durationInSeconds: number,
    pickupDateTime: Date
  ): Promise<PricingCalculation> {
    const pricingRule = await this.getActivePricingRule()
    
    if (!pricingRule) {
      // Fallback to default pricing if no rule found
      return this.getDefaultPricing(distanceInMeters, durationInSeconds)
    }
    
    const distanceInMiles = distanceInMeters / 1609.34
    const durationInMinutes = durationInSeconds / 60
    
    // Calculate base components
    let baseFare = pricingRule.baseFare
    let distanceFare = 0
    let timeFare = 0
    
    // Calculate distance fare (only charge for distance beyond free distance)
    const chargeableDistance = Math.max(0, distanceInMiles - pricingRule.freeDistance)
    distanceFare = chargeableDistance * pricingRule.perMileRate
    
    // Calculate time fare
    timeFare = durationInMinutes * pricingRule.perMinuteRate
    
    // Calculate multipliers
    let multiplier = 1.0
    
    // Peak hour multiplier (6-9 AM and 5-8 PM)
    const hour = pickupDateTime.getHours()
    if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20)) {
      multiplier *= pricingRule.peakHourMultiplier
    }
    
    // Weekend multiplier (Saturday and Sunday)
    const dayOfWeek = pickupDateTime.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      multiplier *= pricingRule.weekendMultiplier
    }
    
    // Calculate total before applying minimum
    const subtotal = (baseFare + distanceFare + timeFare) * multiplier
    const totalFare = Math.max(subtotal, pricingRule.minimumFare)
    
    return {
      baseFare: pricingRule.baseFare,
      distanceFare,
      timeFare,
      multiplier,
      totalFare,
      breakdown: {
        base: baseFare,
        distance: distanceFare,
        time: timeFare,
        surge: (subtotal - (baseFare + distanceFare + timeFare)),
      },
    }
  }
  
  private static getDefaultPricing(
    distanceInMeters: number,
    durationInSeconds: number
  ): PricingCalculation {
    const distanceInMiles = distanceInMeters / 1609.34
    const baseFare = 55
    const perMile = 3.5
    const minimumFare = 55
    
    let fare = 0
    if (distanceInMiles <= 10) {
      fare = baseFare
    } else {
      fare = baseFare + ((distanceInMiles - 10) * perMile)
    }
    
    const totalFare = Math.max(fare, minimumFare)
    
    return {
      baseFare,
      distanceFare: Math.max(0, (distanceInMiles - 10) * perMile),
      timeFare: 0,
      multiplier: 1.0,
      totalFare,
      breakdown: {
        base: baseFare,
        distance: Math.max(0, (distanceInMiles - 10) * perMile),
        time: 0,
        surge: 0,
      },
    }
  }
  
  static async createPricingRule(data: {
    name: string
    description?: string
    baseFare: number
    perMileRate: number
    perMinuteRate: number
    minimumFare: number
    freeDistance?: number
    peakHourMultiplier?: number
    weekendMultiplier?: number
    validFrom?: Date
    validTo?: Date
  }) {
    return await prisma.pricingRule.create({
      data: {
        name: data.name,
        description: data.description,
        baseFare: data.baseFare,
        perMileRate: data.perMileRate,
        perMinuteRate: data.perMinuteRate,
        minimumFare: data.minimumFare,
        freeDistance: data.freeDistance || 0,
        peakHourMultiplier: data.peakHourMultiplier || 1.0,
        weekendMultiplier: data.weekendMultiplier || 1.0,
        validFrom: data.validFrom,
        validTo: data.validTo,
      },
    })
  }
  
  static async updatePricingRule(id: string, data: Partial<{
    name: string
    description: string
    baseFare: number
    perMileRate: number
    perMinuteRate: number
    minimumFare: number
    freeDistance: number
    peakHourMultiplier: number
    weekendMultiplier: number
    isActive: boolean
    validFrom: Date
    validTo: Date
  }>) {
    return await prisma.pricingRule.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })
  }
  
  static async getAllPricingRules({
    page = 1,
    limit = 10,
    active,
  }: {
    page?: number
    limit?: number
    active?: boolean
  } = {}) {
    const skip = (page - 1) * limit
    
    const where = {
      ...(active !== undefined && { isActive: active }),
    }
    
    const [rules, total] = await Promise.all([
      prisma.pricingRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pricingRule.count({ where }),
    ])
    
    return {
      rules,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    }
  }
  
  static async deletePricingRule(id: string) {
    return await prisma.pricingRule.delete({
      where: { id },
    })
  }
}