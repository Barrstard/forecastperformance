'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useEnvironmentStore } from '@/stores/environment-store'

interface UKGProBatchJob {
  id: string
  name: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
  progress: number
  startTime: string
  endTime?: string
  error?: string
  jobType: 'forecast' | 'data_sync' | 'report' | 'analysis' | 'custom'
  priority: number
  estimatedCompletion?: string
  createdBy: string
  lastUpdated: string
  metadata?: {
    modelId?: string
    parameters?: Record<string, any>
    targetTables?: string[]
    dataRange?: {
      start: string
      end: string
    }
    orgIds?: number[]
  }
  subJobs?: any[]
  totalSubJobs?: number
  completedSubJobs?: number
}

interface BatchJobsResponse {
  success: boolean
  jobs: UKGProBatchJob[]
  total: number
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export function BatchJobsWidget() {
  const { currentEnvironment } = useEnvironmentStore()
  const [jobs, setJobs] = useState<UKGProBatchJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchBatchJobs = async () => {
    if (!currentEnvironment?.id) {
      setError('No environment selected')
      setLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch(
        `/api/ukg/batch-jobs?environmentId=${currentEnvironment.id}&limit=10`
      )
      const data: BatchJobsResponse = await response.json()

      if (data.success) {
        setJobs(data.jobs)
      } else {
        setError(data.error || 'Failed to fetch batch jobs')
      }
    } catch (err) {
      setError('Failed to fetch batch jobs')
      console.error('Error fetching batch jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  const performJobAction = async (jobId: string, action: 'cancel' | 'pause' | 'resume') => {
    if (!currentEnvironment?.id) return

    setActionLoading(jobId)
    try {
      const response = await fetch(`/api/ukg/batch-jobs/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environmentId: currentEnvironment.id,
          action
        })
      })

      const data = await response.json()
      if (data.success) {
        // Refresh jobs list
        await fetchBatchJobs()
      } else {
        setError(data.error || `Failed to ${action} job`)
      }
    } catch (err) {
      setError(`Failed to ${action} job`)
      console.error(`Error ${action}ing job:`, err)
    } finally {
      setActionLoading(null)
    }
  }

  const refreshJobs = async () => {
    setRefreshing(true)
    await fetchBatchJobs()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchBatchJobs()
  }, [currentEnvironment?.id])

  // Auto-refresh every 30 seconds for running jobs
  useEffect(() => {
    const interval = setInterval(() => {
      if (jobs.some(job => job.status === 'running' || job.status === 'pending')) {
        fetchBatchJobs()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [jobs])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (!currentEnvironment) {
    return (
      <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20">
        <CardHeader className="border-b border-white/20">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg gradient-primary">
              <Play className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold">UKG Pro Batch Jobs</span>
          </CardTitle>
          <CardDescription>Monitor and manage batch jobs</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="glass-input dark:glass-input-dark border-orange-200/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select an environment to view batch jobs
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20">
      <CardHeader className="border-b border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg gradient-primary">
                <Play className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold">UKG Pro Batch Jobs</span>
            </CardTitle>
            <CardDescription>
              Monitor and manage batch jobs for {currentEnvironment.name}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshJobs}
            disabled={refreshing}
            className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading batch jobs...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No batch jobs found
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 p-4 space-y-3 hover-glass dark:hover-glass-dark transition-glass"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(job.status)}
                      <h4 className="font-medium">{job.name}</h4>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                      <Badge variant="outline">
                        {job.jobType}
                      </Badge>
                    </div>
                    {job.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {job.description}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Created by: {job.createdBy}</div>
                      <div>Started: {formatDate(job.startTime)}</div>
                      {job.endTime && (
                        <div>Completed: {formatDate(job.endTime)}</div>
                      )}
                      {job.estimatedCompletion && (
                        <div>Estimated completion: {formatDate(job.estimatedCompletion)}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {job.status === 'running' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => performJobAction(job.id, 'pause')}
                          disabled={actionLoading === job.id}
                          className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => performJobAction(job.id, 'cancel')}
                          disabled={actionLoading === job.id}
                          className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {job.status === 'paused' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performJobAction(job.id, 'resume')}
                        disabled={actionLoading === job.id}
                        className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {(job.status === 'running' || job.status === 'pending') && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{job.progress}%</span>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                  </div>
                )}

                {job.subJobs && job.totalSubJobs && (
                  <div className="text-xs text-gray-500">
                    Sub-jobs: {job.completedSubJobs || 0} / {job.totalSubJobs}
                  </div>
                )}

                {job.error && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{job.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 