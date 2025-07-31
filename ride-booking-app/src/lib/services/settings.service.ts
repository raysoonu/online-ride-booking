import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'
const ALGORITHM = 'aes-256-gcm'

interface SettingValue {
  key: string
  value: any
  description?: string
  category?: string
  isEncrypted?: boolean
  isSensitive?: boolean
  dataType?: 'string' | 'number' | 'boolean' | 'json'
}

class SettingsService {
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag()
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':')
      if (parts.length !== 3) throw new Error('Invalid encrypted format')
      
      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = parts[2]
      
      const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
      decipher.setAuthTag(authTag)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      return encryptedText // Return as-is if decryption fails
    }
  }

  private parseValue(value: string, dataType: string): any {
    switch (dataType) {
      case 'number':
        return parseFloat(value)
      case 'boolean':
        return value === 'true'
      case 'json':
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      default:
        return value
    }
  }

  private stringifyValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  }

  async getSetting(key: string): Promise<any> {
    const setting = await prisma.settings.findUnique({
      where: { key }
    })

    if (!setting) {
      return null
    }

    let value = setting.value
    if (setting.isEncrypted) {
      value = this.decrypt(value)
    }

    return this.parseValue(value, setting.dataType)
  }

  async setSetting(data: SettingValue): Promise<void> {
    let value = this.stringifyValue(data.value)
    
    if (data.isEncrypted || data.isSensitive) {
      value = this.encrypt(value)
    }

    await prisma.settings.upsert({
      where: { key: data.key },
      update: {
        value,
        description: data.description,
        category: data.category || 'general',
        isEncrypted: data.isEncrypted || data.isSensitive || false,
        isSensitive: data.isSensitive || false,
        dataType: data.dataType || 'string'
      },
      create: {
        key: data.key,
        value,
        description: data.description,
        category: data.category || 'general',
        isEncrypted: data.isEncrypted || data.isSensitive || false,
        isSensitive: data.isSensitive || false,
        dataType: data.dataType || 'string'
      }
    })
  }

  async getSettingsByCategory(category: string): Promise<any[]> {
    const settings = await prisma.settings.findMany({
      where: { category },
      orderBy: { key: 'asc' }
    })

    return settings.map(setting => {
      let value = setting.value
      if (setting.isEncrypted) {
        value = this.decrypt(value)
      }

      return {
        ...setting,
        value: setting.isSensitive ? '***HIDDEN***' : this.parseValue(value, setting.dataType),
        actualValue: this.parseValue(value, setting.dataType)
      }
    })
  }

  async getAllSettings(): Promise<any[]> {
    const settings = await prisma.settings.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    })

    return settings.map(setting => {
      let value = setting.value
      if (setting.isEncrypted) {
        value = this.decrypt(value)
      }

      return {
        ...setting,
        value: setting.isSensitive ? '***HIDDEN***' : this.parseValue(value, setting.dataType),
        actualValue: this.parseValue(value, setting.dataType)
      }
    })
  }

  async deleteSetting(key: string): Promise<void> {
    await prisma.settings.delete({
      where: { key }
    })
  }

  // Predefined settings with their configurations
  async initializeDefaultSettings(): Promise<void> {
    const defaultSettings: SettingValue[] = [
      // Application Settings
      {
        key: 'app_name',
        value: 'Ride Booking App',
        description: 'Application name displayed to users',
        category: 'application'
      },
      {
        key: 'app_logo_url',
        value: '',
        description: 'URL to application logo',
        category: 'application'
      },
      {
        key: 'primary_color',
        value: '#2563eb',
        description: 'Primary brand color',
        category: 'application'
      },
      
      // Google Maps Settings
      {
        key: 'google_maps_api_key',
        value: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        description: 'Google Maps API key for location services',
        category: 'integrations',
        isEncrypted: true,
        isSensitive: true
      },
      
      // Email Settings
      {
        key: 'smtp_host',
        value: process.env.SMTP_HOST || 'smtp.gmail.com',
        description: 'SMTP server hostname',
        category: 'email'
      },
      {
        key: 'smtp_port',
        value: parseInt(process.env.SMTP_PORT || '587'),
        description: 'SMTP server port',
        category: 'email',
        dataType: 'number'
      },
      {
        key: 'smtp_user',
        value: process.env.SMTP_USER || '',
        description: 'SMTP username',
        category: 'email',
        isEncrypted: true,
        isSensitive: true
      },
      {
        key: 'smtp_password',
        value: process.env.SMTP_PASS || '',
        description: 'SMTP password',
        category: 'email',
        isEncrypted: true,
        isSensitive: true
      },
      {
        key: 'from_email',
        value: process.env.FROM_EMAIL || 'noreply@ridebooking.com',
        description: 'Default sender email address',
        category: 'email'
      },
      {
        key: 'from_name',
        value: process.env.FROM_NAME || 'Ride Booking',
        description: 'Default sender name',
        category: 'email'
      },
      
      // Security Settings
      {
        key: 'jwt_secret',
        value: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
        description: 'JWT signing secret key',
        category: 'security',
        isEncrypted: true,
        isSensitive: true
      },
      {
        key: 'jwt_expires_in',
        value: process.env.JWT_EXPIRES_IN || '7d',
        description: 'JWT token expiration time',
        category: 'security'
      },
      
      // Business Settings
      {
        key: 'currency',
        value: 'NPR',
        description: 'Default currency code',
        category: 'business'
      },
      {
        key: 'timezone',
        value: 'America/New_York',
        description: 'Default timezone',
        category: 'business'
      },
      {
        key: 'booking_advance_days',
        value: 30,
        description: 'Maximum days in advance for booking',
        category: 'business',
        dataType: 'number'
      },
      
      // Pricing Settings
      {
        key: 'rate_per_km',
        value: 20,
        description: 'Rate per kilometer in NPR',
        category: 'pricing',
        dataType: 'number'
      },
      {
        key: 'minimum_fare',
        value: 50,
        description: 'Minimum fare in NPR',
        category: 'pricing',
        dataType: 'number'
      },
      {
        key: 'use_simple_pricing',
        value: true,
        description: 'Use simple per-kilometer pricing instead of complex pricing rules',
        category: 'pricing',
        dataType: 'boolean'
      }
    ]

    for (const setting of defaultSettings) {
      const existing = await prisma.settings.findUnique({
        where: { key: setting.key }
      })
      
      if (!existing) {
        await this.setSetting(setting)
      }
    }
  }
}

export const settingsService = new SettingsService()
export default settingsService