import { prisma } from '@/lib/prisma'
import { PricingCalculation } from '@/types'

import { settingsService } from '@/lib/services/settings.service'

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
    const distanceInKm = distanceInMeters / 1000

    try {
      const pricingSettings = await settingsService.getSettingsByCategory('pricing')
      const settingsMap: Record<string, any> = {}
      pricingSettings.forEach((s) => {
        settingsMap[s.key] = s.actualValue
      })

      const ratePerKm = parseFloat(settingsMap.rate_per_km) || 20
      const minimumFare = parseFloat(settingsMap.minimum_fare) || 50

      const rawFare = distanceInKm * ratePerKm
      const totalFare = Math.max(rawFare, minimumFare)
      const roundedFare = Number(totalFare.toFixed(2))

      return {
        baseFare: minimumFare,
        distanceFare: rawFare,
        timeFare: 0,
        multiplier: 1.0,
        totalFare: roundedFare,
        breakdown: {
          base: minimumFare,
          distance: rawFare,
          time: 0,
          surge: 0,
        },
      }
    } catch (e) {
      console.warn('Failed to load settings in PricingService, using default KM pricing:', e)
      const rawFare = distanceInKm * 20
      const totalFare = Math.max(rawFare, 50)
      const roundedFare = Number(totalFare.toFixed(2))

      return {
        baseFare: 50,
        distanceFare: rawFare,
        timeFare: 0,
        multiplier: 1.0,
        totalFare: roundedFare,
        breakdown: {
          base: 50,
          distance: rawFare,
          time: 0,
          surge: 0,
        },
      }
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