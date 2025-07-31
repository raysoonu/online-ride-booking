'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type { DashboardStats, BookingWithDriver, PricingRule } from '@/types'
import SettingsManager from '@/components/admin/SettingsManager'

interface LoginForm {
  email: string
  password: string
}

interface PricingRuleForm {
  name: string
  baseFare: number
  perMileRate: number
  perMinuteRate: number
  peakHourMultiplier: number
  weekendMultiplier: number
  isActive: boolean
}

type AdminTab = 'dashboard' | 'bookings' | 'pricing' | 'drivers' | 'settings'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' })
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<BookingWithDriver[]>([])
  const [allBookings, setAllBookings] = useState<BookingWithDriver[]>([])
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [error, setError] = useState('')
  const [isCreatePricingOpen, setIsCreatePricingOpen] = useState(false)
  const [pricingForm, setPricingForm] = useState<PricingRuleForm>({
    name: '',
    baseFare: 0,
    perMileRate: 0,
    perMinuteRate: 0,
    peakHourMultiplier: 1,
    weekendMultiplier: 1,
    isActive: true
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/admin/auth', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setIsAuthenticated(true)
        await fetchDashboardData()
      } else {
        localStorage.removeItem('adminToken')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...loginForm, action: 'login' })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('adminToken', data.token)
        setIsAuthenticated(true)
        await fetchDashboardData()
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      setError('Login failed. Please try again.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    setIsAuthenticated(false)
    setStats(null)
    setRecentBookings([])
    setAllBookings([])
    setPricingRules([])
  }

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch recent bookings
      const bookingsResponse = await fetch('/api/admin/bookings?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        setRecentBookings(bookingsData.bookings)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }

  const fetchAllBookings = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAllBookings(data.bookings)
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    }
  }

  const fetchPricingRules = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/pricing', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPricingRules(data.rules)
      }
    } catch (error) {
      console.error('Failed to fetch pricing rules:', error)
    }
  }

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId, status })
      })

      if (response.ok) {
        await fetchDashboardData()
        if (activeTab === 'bookings') {
          await fetchAllBookings()
        }
      }
    } catch (error) {
      console.error('Failed to update booking status:', error)
    }
  }

  const createPricingRule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pricingForm)
      })

      if (response.ok) {
        setIsCreatePricingOpen(false)
        setPricingForm({
          name: '',
          baseFare: 0,
          perMileRate: 0,
          perMinuteRate: 0,
          peakHourMultiplier: 1,
          weekendMultiplier: 1,
          isActive: true
        })
        await fetchPricingRules()
      }
    } catch (error) {
      console.error('Failed to create pricing rule:', error)
    }
  }

  const togglePricingRule = async (ruleId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ruleId, isActive })
      })

      if (response.ok) {
        await fetchPricingRules()
      }
    } catch (error) {
      console.error('Failed to update pricing rule:', error)
    }
  }

  const handleTabChange = async (tab: AdminTab) => {
    setActiveTab(tab)
    if (tab === 'bookings' && allBookings.length === 0) {
      await fetchAllBookings()
    } else if (tab === 'pricing' && pricingRules.length === 0) {
      await fetchPricingRules()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center admin-gradient">
        <Card className="w-full max-w-md shadow-2xl border-0" style={{ backgroundColor: 'var(--admin-card)', backdropFilter: 'blur(10px)' }}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>Admin Login</CardTitle>
            <CardDescription style={{ color: 'var(--admin-text-secondary)' }}>Enter your credentials to access the admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  className="h-12 text-base admin-input"
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                  className="h-12 text-base admin-input"
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-md border border-red-200">{error}</div>
              )}
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold admin-button-primary transition-opacity"
              >
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--admin-surface)' }}>
      <div className="admin-gradient shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-blue-100 mt-1">Manage your ride booking platform</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Logout
            </Button>
          </div>
          <nav className="mt-6">
            <div className="flex space-x-2">
              {(['dashboard', 'bookings', 'pricing', 'drivers', 'settings'] as AdminTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`admin-nav-item capitalize ${
                    activeTab === tab ? 'active' : ''
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Dashboard Stats */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="admin-card-hover border-0 shadow-md" style={{ backgroundColor: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" style={{ color: 'var(--admin-text-secondary)' }}>Total Bookings</CardTitle>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--admin-primary)' }}>
                      <span className="text-white text-xs">📊</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>{stats.totalBookings}</div>
                    <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>All time bookings</p>
                  </CardContent>
                </Card>
                <Card className="admin-card-hover border-0 shadow-md" style={{ backgroundColor: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" style={{ color: 'var(--admin-text-secondary)' }}>Pending Bookings</CardTitle>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--admin-warning)' }}>
                      <span className="text-white text-xs">⏳</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>{stats.pendingBookings}</div>
                    <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Awaiting confirmation</p>
                  </CardContent>
                </Card>
                <Card className="admin-card-hover border-0 shadow-md" style={{ backgroundColor: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" style={{ color: 'var(--admin-text-secondary)' }}>Total Revenue</CardTitle>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--admin-success)' }}>
                      <span className="text-white text-xs">💰</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>{formatCurrency(stats.totalRevenue)}</div>
                    <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Total earnings</p>
                  </CardContent>
                </Card>
                <Card className="admin-card-hover border-0 shadow-md" style={{ backgroundColor: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" style={{ color: 'var(--admin-text-secondary)' }}>Active Drivers</CardTitle>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--admin-accent)' }}>
                      <span className="text-white text-xs">🚗</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>{stats.activeDrivers}</div>
                    <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Available now</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Bookings */}
            <Card className="border-0 shadow-md" style={{ backgroundColor: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}>
              <CardHeader>
                <CardTitle style={{ color: 'var(--admin-text-primary)' }}>Recent Bookings</CardTitle>
                <CardDescription style={{ color: 'var(--admin-text-secondary)' }}>Latest booking requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg admin-card-hover" style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                      <div>
                        <div className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{booking.customerName}</div>
                        <div className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                          {booking.pickupAddress} → {booking.dropoffAddress}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                          {new Date(booking.pickupDate).toLocaleDateString()} at {booking.pickupTime}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`admin-status-badge ${
                          booking.status === 'CONFIRMED' ? 'text-white' :
                          booking.status === 'PENDING' ? 'text-white' :
                          booking.status === 'CANCELLED' ? 'text-white' :
                          'text-white'
                        }`} style={{
                          backgroundColor: 
                            booking.status === 'CONFIRMED' ? 'var(--admin-success)' :
                            booking.status === 'PENDING' ? 'var(--admin-warning)' :
                            booking.status === 'CANCELLED' ? 'var(--admin-error)' :
                            'var(--admin-secondary)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem'
                        }}>
                          {booking.status}
                        </span>
                        {booking.status === 'PENDING' && (
                          <div className="space-x-2">
                            <Button
                              size="sm"
                              onClick={() => updateBookingStatus(booking.id, 'CONFIRMED')}
                              style={{ backgroundColor: 'var(--admin-success)', borderColor: 'var(--admin-success)' }}
                              className="text-white hover:opacity-90"
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBookingStatus(booking.id, 'CANCELLED')}
                              style={{ borderColor: 'var(--admin-error)', color: 'var(--admin-error)' }}
                              className="hover:bg-red-50"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'bookings' && (
          <Card>
            <CardHeader>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>Manage all booking requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="font-medium">{booking.customerName}</div>
                          <div className="text-sm text-gray-600">{booking.customerEmail}</div>
                          <div className="text-sm text-gray-600">{booking.customerPhone}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">#{booking.bookingNumber}</div>
                          <div className="text-sm text-gray-600">
                            {booking.pickupAddress} → {booking.dropoffAddress}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(booking.pickupDate).toLocaleDateString()} at {booking.pickupTime}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{formatCurrency(booking.estimatedFare)}</div>
                          <div className="text-sm text-gray-500">{booking.distance}km • {booking.duration}min</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        booking.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                      {booking.status === 'PENDING' && (
                        <div className="space-x-2">
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'CONFIRMED')}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateBookingStatus(booking.id, 'CANCELLED')}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          onClick={() => updateBookingStatus(booking.id, 'COMPLETED')}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Pricing Rules</h2>
                <p className="text-gray-600">Manage dynamic pricing for rides</p>
              </div>
              <Dialog open={isCreatePricingOpen} onOpenChange={setIsCreatePricingOpen}>
                <DialogTrigger asChild>
                  <Button>Create Pricing Rule</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Pricing Rule</DialogTitle>
                    <DialogDescription>
                      Set up a new pricing rule for ride calculations
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createPricingRule} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Rule Name</label>
                      <Input
                        value={pricingForm.name}
                        onChange={(e) => setPricingForm({ ...pricingForm, name: e.target.value })}
                        placeholder="e.g., Standard Pricing"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Base Fare (NPR)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={pricingForm.baseFare}
                          onChange={(e) => setPricingForm({ ...pricingForm, baseFare: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Per Mile Rate (NPR)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={pricingForm.perMileRate}
                          onChange={(e) => setPricingForm({ ...pricingForm, perMileRate: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Per Minute Rate (NPR)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={pricingForm.perMinuteRate}
                          onChange={(e) => setPricingForm({ ...pricingForm, perMinuteRate: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Peak Hour Multiplier</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={pricingForm.peakHourMultiplier}
                          onChange={(e) => setPricingForm({ ...pricingForm, peakHourMultiplier: parseFloat(e.target.value) || 1 })}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Weekend Multiplier</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={pricingForm.weekendMultiplier}
                        onChange={(e) => setPricingForm({ ...pricingForm, weekendMultiplier: parseFloat(e.target.value) || 1 })}
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreatePricingOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        Create Rule
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {pricingRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{rule.name}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                          <div>Base: {formatCurrency(rule.baseFare)}</div>
                          <div>Per Mile: {formatCurrency(rule.perMileRate)}</div>
                          <div>Per Min: {formatCurrency(rule.perMinuteRate)}</div>
                          <div>Peak: {rule.peakHourMultiplier}x</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePricingRule(rule.id, !rule.isActive)}
                        >
                          {rule.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <Card>
            <CardHeader>
              <CardTitle>Driver Management</CardTitle>
              <CardDescription>Manage drivers and assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Driver management features coming soon...
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <SettingsManager token={localStorage.getItem('adminToken') || ''} />
        )}
      </div>
    </div>
  )
}