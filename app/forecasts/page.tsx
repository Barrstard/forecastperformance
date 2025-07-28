"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForecastStore } from '@/stores/forecast-store'
import { useEnvironmentStore } from '@/stores/environment-store'
import { Plus, Search, Filter, Calendar, Database, Activity, CheckCircle, XCircle, Clock, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ForecastsPage() {
  const router = useRouter()
  const { runs, setRuns } = useForecastStore()
  const { currentEnvironment } = useEnvironmentStore()
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [environmentFilter, setEnvironmentFilter] = useState('all')

  useEffect(() => {
    fetchForecastRuns()
  }, [])

  const fetchForecastRuns = async () => {
    try {
      const response = await fetch('/api/forecasts/runs')
      if (response.ok) {
        const data = await response.json()
        // Ensure data is an array before setting it
        if (Array.isArray(data)) {
          setRuns(data)
        } else {
          console.error('Expected array of runs, got:', typeof data)
          setRuns([])
        }
      } else {
        console.error('Failed to fetch forecast runs:', response.statusText)
        setRuns([])
      }
    } catch (error) {
      console.error('Failed to fetch forecast runs:', error)
      setRuns([])
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'RUNNING':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>
      case 'RUNNING':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Running</Badge>
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredRuns = (runs || []).filter(run => {
    const matchesSearch = run.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         run.modelId?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter
    const matchesEnvironment = environmentFilter === 'all' || run.environmentId === environmentFilter
    
    return matchesSearch && matchesStatus && matchesEnvironment
  })

  const handleNewForecast = () => {
    router.push('/forecasts/new')
  }

  const handleViewDetails = (runId: string) => {
    router.push(`/forecasts/${runId}`)
  }

  const handleRerun = async (runId: string) => {
    try {
      const response = await fetch(`/api/forecasts/runs/${runId}/rerun`, {
        method: 'POST'
      })
      if (response.ok) {
        // Refresh the runs list
        fetchForecastRuns()
      }
    } catch (error) {
      console.error('Failed to rerun forecast:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-glass">
        <div className="glass-card dark:glass-card-dark p-6 rounded-glass shadow-glass border-white/20">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Forecast Runs</h1>
          </div>
          <div className="text-center">Loading forecast runs...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-glass">
      {/* Header */}
      <div className="flex items-center justify-between glass-card dark:glass-card-dark p-6 rounded-glass shadow-glass border-white/20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Forecast Runs</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage forecast executions
          </p>
        </div>
        <Button onClick={handleNewForecast} className="gradient-primary hover:scale-105 transition-glass">
          <Plus className="h-4 w-4 mr-2" />
          New Forecast
        </Button>
      </div>

        {/* Filters */}
        <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20">
          <CardHeader className="border-b border-white/20">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg gradient-primary">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold">Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID or model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 glass-input dark:glass-input-dark"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="glass-input dark:glass-input-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="RUNNING">Running</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                  <SelectTrigger className="glass-input dark:glass-input-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    {currentEnvironment && (
                      <SelectItem value={currentEnvironment.id}>
                        {currentEnvironment.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forecast Runs List */}
        <div className="grid gap-4">
          {filteredRuns.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No forecast runs found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' || environmentFilter !== 'all'
                      ? 'Try adjusting your filters to see more results.'
                      : 'Get started by creating your first forecast run.'}
                  </p>
                  <Button onClick={handleNewForecast}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Forecast
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredRuns.map((run) => (
              <Card key={run.id} className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(run.status)}
                      <div>
                        <CardTitle className="text-lg">{run.id}</CardTitle>
                        <CardDescription>
                          Model: {run.modelId || 'Manual Sync'} • 
                          Project: {run.bigqueryProjectId}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(run.status)}
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(run.id)}
                          className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
                        >
                          View Details
                        </Button>
                        {run.status === 'FAILED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRerun(run.id)}
                            className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Started</div>
                      <div className="font-medium">
                        {run.startTime ? formatDistanceToNow(new Date(run.startTime), { addSuffix: true }) : 'N/A'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground">Duration</div>
                      <div className="font-medium">
                        {run.startTime && run.endTime 
                          ? formatDistanceToNow(new Date(run.startTime), { addSuffix: false })
                          : run.status === 'RUNNING' 
                            ? 'Running...'
                            : 'N/A'
                        }
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground">Data Points</div>
                      <div className="font-medium">
                        {run.dataPoints ? run.dataPoints.toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground">Environment</div>
                      <div className="font-medium">
                        {run.environmentId || 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {run.metadata && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Metadata</div>
                      <div className="text-xs font-mono">
                        {JSON.stringify(run.metadata, null, 2)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Running</span>
              </div>
              <div className="text-2xl font-bold">
                {(runs || []).filter(r => r.status === 'RUNNING').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Completed</span>
              </div>
              <div className="text-2xl font-bold">
                {(runs || []).filter(r => r.status === 'COMPLETED').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Failed</span>
              </div>
              <div className="text-2xl font-bold">
                {(runs || []).filter(r => r.status === 'FAILED').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <div className="text-2xl font-bold">{(runs || []).length}</div>
            </CardContent>
          </Card>
        </div>
      </div>
  )
} 