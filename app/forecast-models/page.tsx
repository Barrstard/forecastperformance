"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Filter, Calendar, Database, TrendingUp, AlertCircle } from 'lucide-react'
import { useForecastComparisonStore, forecastComparisonApi } from '@/stores/forecast-comparison-store'
import { ComparisonModelStatus, DataLoadStatus } from '@/types/forecast-comparison'

export default function ForecastModelsPage() {
  const router = useRouter()
  const { 
    comparisonModels, 
    loading, 
    error, 
    setComparisonModels, 
    setLoading, 
    setError 
  } = useForecastComparisonStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all')

  // Load comparison models on component mount
  useEffect(() => {
    loadComparisonModels()
  }, [])

  const loadComparisonModels = async () => {
    try {
      setLoading(true)
      setError(null)
      const models = await forecastComparisonApi.getComparisonModels()
      setComparisonModels(models)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forecast models')
    } finally {
      setLoading(false)
    }
  }

  // Filter models based on search and filters
  const filteredModels = comparisonModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || model.status === statusFilter
    const matchesEnvironment = environmentFilter === 'all' || 
                              model.environment?.name === environmentFilter

    return matchesSearch && matchesStatus && matchesEnvironment
  })

  // Get unique environments for filter
  const environments = [...new Set(comparisonModels.map(model => model.environment?.name).filter(Boolean))]

  // Get status counts
  const statusCounts = comparisonModels.reduce((acc, model) => {
    acc[model.status] = (acc[model.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const getStatusColor = (status: ComparisonModelStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'ARCHIVED': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getActualsStatusColor = (status: DataLoadStatus) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'LOADING': return 'bg-blue-100 text-blue-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading && comparisonModels.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forecast Models</h1>
          <p className="text-muted-foreground">
            Manage and compare multiple forecast models against actual performance data
          </p>
        </div>
        <Button onClick={() => router.push('/forecast-models/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Model
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Models</p>
                <p className="text-2xl font-bold">{comparisonModels.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold">{statusCounts.ACTIVE || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{statusCounts.COMPLETED || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Draft</p>
                <p className="text-2xl font-bold">{statusCounts.DRAFT || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                {environments.map(env => (
                  <SelectItem key={env} value={env}>{env}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Models Grid */}
      {filteredModels.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No forecast models found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' || environmentFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first forecast comparison model'
              }
            </p>
            <Button onClick={() => router.push('/forecast-models/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Model
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map((model) => (
            <Card 
              key={model.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/forecast-models/${model.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {model.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(model.status)}>
                    {model.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Environment:</span>
                  <span className="font-medium">{model.environment?.name || 'Unknown'}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Period:</span>
                  <span className="font-medium">
                    {formatDate(model.period_start)} - {formatDate(model.period_end)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Actuals:</span>
                  <Badge 
                    variant="secondary" 
                    className={getActualsStatusColor(model.actualsDataset?.loadStatus || 'PENDING')}
                  >
                    {model.actualsDataset?.loadStatus || 'PENDING'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Forecasts:</span>
                  <span className="font-medium">
                    {model.forecastDatasets?.length || 0} datasets
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Runs:</span>
                  <span className="font-medium">
                    {model.comparisonRuns?.length || 0} completed
                  </span>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created {formatDate(model.createdAt)}</span>
                    <span>Updated {formatDate(model.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 