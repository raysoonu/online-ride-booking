import { prisma } from '@/lib/prisma'
import { AuthUser, LoginCredentials, RegisterData } from '@/types'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d'

export class AuthService {
  static async register(data: RegisterData) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })
    
    if (existingUser) {
      throw new Error('User already exists with this email')
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12)
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        role: UserRole.CUSTOMER,
      },
    })
    
    // Generate JWT token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    }
  }
  
  static async login(credentials: LoginCredentials) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    })
    
    if (!user || !user.password) {
      throw new Error('Invalid email or password')
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(credentials.password, user.password)
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password')
    }
    
    // Generate JWT token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    }
  }
  
  static async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      })
      
      if (!user) {
        return null
      }
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    } catch (error) {
      return null
    }
  }
  
  static async createAdmin(data: {
    name: string
    email: string
    password: string
    role?: UserRole
  }) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })
    
    if (existingUser) {
      throw new Error('User already exists with this email')
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12)
    
    // Create admin user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || UserRole.ADMIN,
      },
    })
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  }
  
  static async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })
    
    if (!user || !user.password) {
      throw new Error('User not found')
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    
    if (!isValidPassword) {
      throw new Error('Current password is incorrect')
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })
    
    return true
  }
  
  static async resetPassword(email: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    })
    
    if (!user) {
      throw new Error('User not found')
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })
    
    return true
  }
  
  static async getAllUsers({
    page = 1,
    limit = 10,
    role,
    search,
  }: {
    page?: number
    limit?: number
    role?: UserRole
    search?: string
  } = {}) {
    const skip = (page - 1) * limit
    
    const where = {
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])
    
    return {
      users,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    }
  }
  
  static async deleteUser(id: string) {
    return await prisma.user.delete({
      where: { id },
    })
  }
  
  private static generateToken(user: AuthUser): string {
    const options: SignOptions = { expiresIn: '7d' }
    return jwt.sign(user as any, JWT_SECRET, options)
  }
}

export async function verifyAdminToken(request: Request): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return { success: false, error: 'No token provided' }
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    
    // Check if user has admin privileges
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Insufficient privileges' }
    }

    return { success: true, user: decoded }
  } catch (error) {
    return { success: false, error: 'Invalid token' }
  }
}