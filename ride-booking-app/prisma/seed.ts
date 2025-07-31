import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create default pricing rule
  const existingDefaultPricing = await prisma.pricingRule.findFirst({
    where: { name: 'Standard Pricing' }
  })
  
  const defaultPricing = existingDefaultPricing || await prisma.pricingRule.create({
    data: {
      name: 'Standard Pricing',
      baseFare: 5.00,
      perMileRate: 2.50,
      perMinuteRate: 0.30,
      minimumFare: 3.00,
      peakHourMultiplier: 1.5,
      weekendMultiplier: 1.2,
      isActive: true,
    },
  })

  console.log('✅ Created default pricing rule:', defaultPricing.name)

  // Create premium pricing rule
  const existingPremiumPricing = await prisma.pricingRule.findFirst({
    where: { name: 'Premium Pricing' }
  })
  
  const premiumPricing = existingPremiumPricing || await prisma.pricingRule.create({
    data: {
      name: 'Premium Pricing',
      baseFare: 8.00,
      perMileRate: 3.50,
      perMinuteRate: 0.50,
      minimumFare: 5.00,
      peakHourMultiplier: 2.0,
      weekendMultiplier: 1.5,
      isActive: false,
    },
  })

  console.log('✅ Created premium pricing rule:', premiumPricing.name)

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'System Administrator',
      role: 'SUPER_ADMIN',
    },
  })

  console.log('✅ Created admin user:', adminUser.email)

  // Create default settings
  const settings = await prisma.settings.upsert({
    where: { key: 'app_name' },
    update: {},
    create: {
      key: 'app_name',
      value: 'Ride Booking App',
      description: 'Application name',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'currency' },
    update: {},
    create: {
      key: 'currency',
      value: 'NPR',
      description: 'Default currency',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'timezone' },
    update: {},
    create: {
      key: 'timezone',
      value: 'America/New_York',
      description: 'Default timezone',
    },
  })

  console.log('✅ Created default settings')

  // Create email templates
  const bookingConfirmationTemplate = await prisma.emailTemplate.upsert({
    where: { name: 'booking_confirmation' },
    update: {},
    create: {
      name: 'booking_confirmation',
      subject: 'Booking Confirmation - {{bookingNumber}}',
      htmlContent: `
        <h2>Booking Confirmation</h2>
        <p>Dear \{\{customerName\}\},</p>
        <p>Your ride booking has been confirmed!</p>
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>Booking Details:</h3>
          <p><strong>Booking Number:</strong> \{\{bookingNumber\}\}</p>
          <p><strong>Pickup:</strong> \{\{pickupAddress\}\}</p>
          <p><strong>Dropoff:</strong> \{\{dropoffAddress\}\}</p>
          <p><strong>Date & Time:</strong> \{\{pickupDate\}\} at \{\{pickupTime\}\}</p>
          <p><strong>Fare:</strong> $\{\{fare\}\}</p>
        </div>
        <p>Thank you for choosing our service!</p>
      `,
      textContent: `
        Booking Confirmation
        
        Dear \{\{customerName\}\},
        
        Your ride booking has been confirmed!
        
        Booking Details:
        Booking Number: \{\{bookingNumber\}\}
        Pickup: \{\{pickupAddress\}\}
        Dropoff: \{\{dropoffAddress\}\}
        Date & Time: \{\{pickupDate\}\} at \{\{pickupTime\}\}
        Fare: $\{\{fare\}\}
        
        Thank you for choosing our service!
      `,
      isActive: true,
    },
  })

  const statusUpdateTemplate = await prisma.emailTemplate.upsert({
    where: { name: 'booking_status_update' },
    update: {},
    create: {
      name: 'booking_status_update',
      subject: 'Booking Status Update - {{bookingNumber}}',
      htmlContent: `
        <h2>Booking Status Update</h2>
        <p>Dear \{\{customerName\}\},</p>
        <p>Your booking status has been updated to: <strong>\{\{status\}\}</strong></p>
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>Booking Details:</h3>
          <p><strong>Booking Number:</strong> \{\{bookingNumber\}\}</p>
          <p><strong>Status:</strong> \{\{status\}\}</p>
        </div>
        <p>Thank you for choosing our service!</p>
      `,
      textContent: `
        Booking Status Update
        
        Dear \{\{customerName\}\},
        
        Your booking status has been updated to: \{\{status\}\}
        
        Booking Details:
        Booking Number: \{\{bookingNumber\}\}
        Status: \{\{status\}\}
        
        Thank you for choosing our service!
      `,
      isActive: true,
    },
  })

  console.log('✅ Created email templates')

  // Create sample driver
  const sampleDriver = await prisma.driver.upsert({
    where: { email: 'driver@example.com' },
    update: {},
    create: {
      name: 'John Driver',
      email: 'driver@example.com',
      phone: '+1234567890',
      licenseNumber: 'DL123456789',
      vehicleModel: 'Toyota Camry',
      vehiclePlate: 'ABC-1234',
      vehicleColor: 'Blue',
      isActive: true,
    },
  })

  console.log('✅ Created sample driver:', sampleDriver.name)

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })