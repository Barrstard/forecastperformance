"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { useForecastComparisonStore, forecastComparisonApi } from '@/stores/forecast-comparison-store'
import { CreateComparisonModelRequest } from '@/types/forecast-comparison'

interface Environment {
  id: string
  name: string
  bigqueryProjectId: string
  isActive: boolean
}

export default function NewForecastModelPage() {
  const router = useRouter()
  const { setLoading, setError } = useForecastComparisonStore()
  
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLocalLoading] = useState(false)
  const [error, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState<CreateComparisonModelRequest>({
    name: '',
    description: '',
    environmentId: '',
    period_start: '',
    period_end: ''
  })

  // Load environments on component mount
  useEffect(() => {
    loadEnvironments()
  }, [])

  const loadEnvironments = async () => {
    try {
      setLocalLoading(true)
      const response = await fetch('/api/environments')
      if (!response.ok) throw new Error('Failed to load environments')
      const data = await response.json()
      setEnvironments(data.filter((env: Environment) => env.isActive))
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to load environments')
    } finally {
      setLocalLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreateComparisonModelRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Model name is required'
    }
    if (!formData.environmentId) {
      return 'Environment is required'
    }
    if (!formData.period_start) {
      return 'Start date is required'
    }
    if (!formData.period_end) {
      return 'End date is required'
    }
    
    const startDate = new Date(formData.period_start)
    const endDate = new Date(formData.period_end)
    
    if (startDate >= endDate) {
      return 'End date must be after start date'
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setLocalError(validationError)
      return
    }

    try {
      setLocalLoading(true)
      setLocalError(null)
      
      const newModel = await forecastComparisonApi.createComparisonModel(formData)
      setSuccess(true)
      
      // Redirect to the new model after a short delay
      setTimeout(() => {
        router.push(`/forecast-models/${newModel.id}`)
      }, 1500)
      
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create forecast model')
    } finally {
      setLocalLoading(false)
    }
  }

  if (loading && environments.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="p-0 h-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Forecast Model</h1>
          <p className="text-muted-foreground">
            Set up a new forecast comparison model to analyze multiple forecasting approaches
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Forecast model created successfully! Redirecting to model details...
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
          <CardDescription>
            Define the basic settings for your forecast comparison model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Model Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Model Name *</Label>
              <Input
                id="name"
                placeholder="Enter a descriptive name for your forecast model"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and scope of this forecast comparison"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Environment */}
            <div className="space-y-2">
              <Label htmlFor="environment">Environment *</Label>
              <Select
                value={formData.environmentId}
                onValueChange={(value) => handleInputChange('environmentId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an environment" />
                </SelectTrigger>
                <SelectContent>
                  {environments.map((env) => (
                    <SelectItem key={env.id} value={env.id}>
                      {env.name} ({env.bigqueryProjectId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {environments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active environments found. Please create an environment first.
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period_start">Start Date *</Label>
                <Input
                  id="period_start"
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => handleInputChange('period_start', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="period_end">End Date *</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => handleInputChange('period_end', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || environments.length === 0}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Model
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Load Actuals Data</p>
              <p className="text-sm text-muted-foreground">
                Upload or connect to your actual performance data that will serve as the baseline for comparison.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Add Forecast Datasets</p>
              <p className="text-sm text-muted-foreground">
                Import multiple forecast models from BigQuery, UKG Dimensions, or file uploads.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div>
              <p className="font-medium">Run Comparisons</p>
              <p className="text-sm text-muted-foreground">
                Execute comparison analyses to evaluate forecast accuracy and generate insights.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 