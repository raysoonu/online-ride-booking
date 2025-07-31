import { prisma } from '@/lib/prisma'
import { EmailData } from '@/types'
import { formatCurrency } from '@/lib/utils'
import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@ridebooking.com'
const FROM_NAME = process.env.FROM_NAME || 'Ride Booking'

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })
  
  static async sendEmail(data: EmailData) {
    try {
      const mailOptions = {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      }
      
      const result = await this.transporter.sendMail(mailOptions)
      
      // Log email in database
      await prisma.auditLog.create({
        data: {
          action: 'EMAIL_SENT',
          resource: 'email',
          resourceId: data.to,
          newValues: JSON.stringify({
            to: data.to,
            subject: data.subject,
            messageId: result.messageId,
          }),
        },
      })
      
      return result
    } catch (error) {
      console.error('Email sending failed:', error)
      
      // Log email failure
      await prisma.auditLog.create({
        data: {
          action: 'EMAIL_FAILED',
          resource: 'email',
          resourceId: data.to,
          newValues: JSON.stringify({
            to: data.to,
            subject: data.subject,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      })
      
      throw error
    }
  }
  
  static async sendBookingConfirmation(booking: any) {
    const template = await this.getEmailTemplate('booking_confirmation')
    
    const html = this.replaceTemplateVariables(template?.htmlContent || this.getDefaultBookingTemplate(), {
      customerName: booking.customerName,
      bookingNumber: booking.bookingNumber,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      pickupDate: new Date(booking.pickupDate).toLocaleDateString(),
      pickupTime: booking.pickupTime,
      fare: formatCurrency(booking.fare),
      paymentStatus: booking.paymentStatus,
    })
    
    return await this.sendEmail({
      to: booking.customerEmail,
      subject: `Booking Confirmation - ${booking.bookingNumber}`,
      html,
    })
  }
  
  static async sendBookingStatusUpdate(booking: any, oldStatus: string) {
    const template = await this.getEmailTemplate('booking_status_update')
    
    const html = this.replaceTemplateVariables(template?.htmlContent || this.getDefaultStatusUpdateTemplate(), {
      customerName: booking.customerName,
      bookingNumber: booking.bookingNumber,
      oldStatus,
      newStatus: booking.status,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      pickupDate: new Date(booking.pickupDate).toLocaleDateString(),
      pickupTime: booking.pickupTime,
    })
    
    return await this.sendEmail({
      to: booking.customerEmail,
      subject: `Booking Update - ${booking.bookingNumber}`,
      html,
    })
  }
  
  static async sendDriverAssignment(booking: any, driver: any) {
    const template = await this.getEmailTemplate('driver_assignment')
    
    const html = this.replaceTemplateVariables(template?.htmlContent || this.getDefaultDriverAssignmentTemplate(), {
      customerName: booking.customerName,
      bookingNumber: booking.bookingNumber,
      driverName: driver.name,
      driverPhone: driver.phone,
      vehicleInfo: `${driver.vehicleModel} (${driver.licensePlate})`,
      pickupAddress: booking.pickupAddress,
      pickupDate: new Date(booking.pickupDate).toLocaleDateString(),
      pickupTime: booking.pickupTime,
    })
    
    return await this.sendEmail({
      to: booking.customerEmail,
      subject: `Driver Assigned - ${booking.bookingNumber}`,
      html,
    })
  }
  
  static async sendWelcomeEmail(user: any) {
    const template = await this.getEmailTemplate('welcome')
    
    const html = this.replaceTemplateVariables(template?.htmlContent || this.getDefaultWelcomeTemplate(), {
      userName: user.name,
      userEmail: user.email,
    })
    
    return await this.sendEmail({
      to: user.email,
      subject: 'Welcome to Ride Booking!',
      html,
    })
  }
  
  static async sendPasswordReset(user: any, resetToken: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
    const template = await this.getEmailTemplate('password_reset')
    
    const html = this.replaceTemplateVariables(template?.htmlContent || this.getDefaultPasswordResetTemplate(), {
      userName: user.name,
      resetUrl,
    })
    
    return await this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html,
    })
  }
  
  private static async getEmailTemplate(name: string) {
    return await prisma.emailTemplate.findUnique({
      where: { name },
    })
  }
  
  private static replaceTemplateVariables(template: string, variables: Record<string, string>) {
    let result = template
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
    return result
  }
  
  private static getDefaultBookingTemplate() {
    return `
      <h2>Booking Confirmation</h2>
      <p>Dear {{customerName}},</p>
      <p>Your ride booking has been confirmed!</p>
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <h3>Booking Details</h3>
        <p><strong>Booking Number:</strong> {{bookingNumber}}</p>
        <p><strong>Pickup:</strong> {{pickupAddress}}</p>
        <p><strong>Dropoff:</strong> {{dropoffAddress}}</p>
        <p><strong>Date:</strong> {{pickupDate}}</p>
        <p><strong>Time:</strong> {{pickupTime}}</p>
        <p><strong>Fare:</strong> {{fare}}</p>
        <p><strong>Payment Status:</strong> {{paymentStatus}}</p>
      </div>
      <p>Thank you for choosing our service!</p>
    `
  }
  
  private static getDefaultStatusUpdateTemplate() {
    return `
      <h2>Booking Status Update</h2>
      <p>Dear {{customerName}},</p>
      <p>Your booking status has been updated.</p>
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <h3>Booking Details</h3>
        <p><strong>Booking Number:</strong> {{bookingNumber}}</p>
        <p><strong>Previous Status:</strong> {{oldStatus}}</p>
        <p><strong>Current Status:</strong> {{newStatus}}</p>
        <p><strong>Pickup:</strong> {{pickupAddress}}</p>
        <p><strong>Dropoff:</strong> {{dropoffAddress}}</p>
        <p><strong>Date:</strong> {{pickupDate}}</p>
        <p><strong>Time:</strong> {{pickupTime}}</p>
      </div>
    `
  }
  
  private static getDefaultDriverAssignmentTemplate() {
    return `
      <h2>Driver Assigned</h2>
      <p>Dear {{customerName}},</p>
      <p>A driver has been assigned to your booking!</p>
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <h3>Driver Details</h3>
        <p><strong>Driver Name:</strong> {{driverName}}</p>
        <p><strong>Phone:</strong> {{driverPhone}}</p>
        <p><strong>Vehicle:</strong> {{vehicleInfo}}</p>
        <h3>Trip Details</h3>
        <p><strong>Booking Number:</strong> {{bookingNumber}}</p>
        <p><strong>Pickup:</strong> {{pickupAddress}}</p>
        <p><strong>Date:</strong> {{pickupDate}}</p>
        <p><strong>Time:</strong> {{pickupTime}}</p>
      </div>
    `
  }
  
  private static getDefaultWelcomeTemplate() {
    return `
      <h2>Welcome to Ride Booking!</h2>
      <p>Dear {{userName}},</p>
      <p>Welcome to our ride booking service! We're excited to have you on board.</p>
      <p>Your account has been created with email: {{userEmail}}</p>
      <p>You can now start booking rides through our platform.</p>
      <p>Thank you for choosing us!</p>
    `
  }
  
  private static getDefaultPasswordResetTemplate() {
    return `
      <h2>Password Reset Request</h2>
      <p>Dear {{userName}},</p>
      <p>You have requested to reset your password.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="{{resetUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `
  }
}