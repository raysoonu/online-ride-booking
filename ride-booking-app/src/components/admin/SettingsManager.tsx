'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Eye, EyeOff, Plus, Save, Trash2, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Setting {
  id: string
  key: string
  value: any
  actualValue: any
  description?: string
  category: string
  isEncrypted: boolean
  isSensitive: boolean
  dataType: string
  createdAt: string
  updatedAt: string
}

interface SettingsManagerProps {
  token: string
}

export default function SettingsManager({ token }: SettingsManagerProps) {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('application')
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({})
  const [editingSettings, setEditingSettings] = useState<Record<string, any>>({})
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    description: '',
    category: 'general',
    isEncrypted: false,
    isSensitive: false,
    dataType: 'string'
  })
  const [showAddForm, setShowAddForm] = useState(false)

  const categories = [
    { value: 'application', label: 'Application' },
    { value: 'integrations', label: 'Integrations' },
    { value: 'email', label: 'Email' },
    { value: 'security', label: 'Security' },
    { value: 'business', label: 'Business' },
    { value: 'general', label: 'General' }
  ]

  const dataTypes = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'json', label: 'JSON' }
  ]

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
        // Initialize editing state
        const editState: Record<string, any> = {}
        data.data.forEach((setting: Setting) => {
          editState[setting.key] = setting.actualValue
        })
        setEditingSettings(editState)
      } else {
        setError(data.error || 'Failed to fetch settings')
      }
    } catch (err) {
      setError('Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const initializeSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/settings/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setSuccess('Default settings initialized successfully')
        fetchSettings()
      } else {
        setError(data.error || 'Failed to initialize settings')
      }
    } catch (err) {
      setError('Failed to initialize settings')
    } finally {
      setSaving(false)
    }
  }

  const saveSetting = async (key: string) => {
    try {
      setSaving(true)
      const setting = settings.find(s => s.key === key)
      if (!setting) return

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key,
          value: editingSettings[key],
          description: setting.description,
          category: setting.category,
          isEncrypted: setting.isEncrypted,
          isSensitive: setting.isSensitive,
          dataType: setting.dataType
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setSuccess('Setting saved successfully')
        fetchSettings()
      } else {
        setError(data.error || 'Failed to save setting')
      }
    } catch (err) {
      setError('Failed to save setting')
    } finally {
      setSaving(false)
    }
  }

  const addNewSetting = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSetting)
      })
      
      const data = await response.json()
      if (data.success) {
        setSuccess('Setting added successfully')
        setNewSetting({
          key: '',
          value: '',
          description: '',
          category: 'general',
          isEncrypted: false,
          isSensitive: false,
          dataType: 'string'
        })
        setShowAddForm(false)
        fetchSettings()
      } else {
        setError(data.error || 'Failed to add setting')
      }
    } catch (err) {
      setError('Failed to add setting')
    } finally {
      setSaving(false)
    }
  }

  const deleteSetting = async (key: string) => {
    if (!confirm('Are you sure you want to delete this setting?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/settings?key=${key}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setSuccess('Setting deleted successfully')
        fetchSettings()
      } else {
        setError(data.error || 'Failed to delete setting')
      }
    } catch (err) {
      setError('Failed to delete setting')
    } finally {
      setSaving(false)
    }
  }

  const toggleSensitiveVisibility = (key: string) => {
    setShowSensitive(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const updateEditingValue = (key: string, value: any) => {
    setEditingSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const renderValueInput = (setting: Setting) => {
    const value = editingSettings[setting.key]
    const isHidden = setting.isSensitive && !showSensitive[setting.key]

    switch (setting.dataType) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => updateEditingValue(setting.key, checked)}
            />
            <Label>{value ? 'True' : 'False'}</Label>
          </div>
        )
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => updateEditingValue(setting.key, parseFloat(e.target.value) || 0)}
            className="admin-input"
          />
        )
      case 'json':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                updateEditingValue(setting.key, parsed)
              } catch {
                updateEditingValue(setting.key, e.target.value)
              }
            }}
            className="admin-input font-mono text-sm"
            rows={4}
          />
        )
      default:
        return (
          <div className="relative">
            <Input
              type={isHidden ? 'password' : 'text'}
              value={isHidden ? '***HIDDEN***' : (value || '')}
              onChange={(e) => updateEditingValue(setting.key, e.target.value)}
              className="admin-input pr-10"
              disabled={isHidden}
            />
            {setting.isSensitive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={() => toggleSensitiveVisibility(setting.key)}
              >
                {showSensitive[setting.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
          </div>
        )
    }
  }

  const filteredSettings = settings.filter(setting => setting.category === selectedCategory)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>Settings Management</h2>
          <p style={{ color: 'var(--admin-text-secondary)' }}>Manage application configuration securely</p>
        </div>
        <div className="space-x-2">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="admin-button-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Setting
          </Button>
          <Button
            onClick={initializeSettings}
            disabled={saving}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Initialize Defaults
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="border-0 shadow-md" style={{ backgroundColor: 'var(--admin-card)' }}>
          <CardHeader>
            <CardTitle style={{ color: 'var(--admin-text-primary)' }}>Add New Setting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Key</Label>
                <Input
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                  placeholder="setting_key"
                  className="admin-input"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newSetting.category} onValueChange={(value: string) => setNewSetting({ ...newSetting, category: value })}>
                  <SelectTrigger className="admin-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newSetting.description}
                onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                placeholder="Setting description"
                className="admin-input"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Data Type</Label>
                <Select value={newSetting.dataType} onValueChange={(value: string) => setNewSetting({ ...newSetting, dataType: value })}>
                  <SelectTrigger className="admin-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newSetting.isSensitive}
                  onCheckedChange={(checked) => setNewSetting({ ...newSetting, isSensitive: checked, isEncrypted: checked })}
                />
                <Label>Sensitive</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newSetting.isEncrypted}
                  onCheckedChange={(checked) => setNewSetting({ ...newSetting, isEncrypted: checked })}
                />
                <Label>Encrypted</Label>
              </div>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                value={newSetting.value}
                onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                placeholder="Setting value"
                className="admin-input"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={addNewSetting} disabled={saving} className="admin-button-primary">
                <Save className="h-4 w-4 mr-2" />
                Add Setting
              </Button>
              <Button onClick={() => setShowAddForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-6">
          {categories.map(category => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category.value} value={category.value} className="space-y-4">
            {filteredSettings.length === 0 ? (
              <Card className="border-0 shadow-md" style={{ backgroundColor: 'var(--admin-card)' }}>
                <CardContent className="p-8 text-center">
                  <p style={{ color: 'var(--admin-text-secondary)' }}>No settings found in this category</p>
                </CardContent>
              </Card>
            ) : (
              filteredSettings.map(setting => (
                <Card key={setting.key} className="border-0 shadow-md" style={{ backgroundColor: 'var(--admin-card)' }}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg" style={{ color: 'var(--admin-text-primary)' }}>
                          {setting.key}
                          <div className="flex space-x-2 mt-2">
                            {setting.isSensitive && <Badge variant="destructive">Sensitive</Badge>}
                            {setting.isEncrypted && <Badge variant="secondary">Encrypted</Badge>}
                            <Badge variant="outline">{setting.dataType}</Badge>
                          </div>
                        </CardTitle>
                        {setting.description && (
                          <CardDescription style={{ color: 'var(--admin-text-secondary)' }}>
                            {setting.description}
                          </CardDescription>
                        )}
                      </div>
                      <Button
                        onClick={() => deleteSetting(setting.key)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Value</Label>
                      {renderValueInput(setting)}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => saveSetting(setting.key)}
                        disabled={saving}
                        className="admin-button-primary"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}