"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  RefreshCw, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trash2,
  AlertTriangle,
  Database,
  TrendingUp,
  Users
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { RedisStatus } from '@/components/ui/redis-status'

// Helper function to format duration in seconds to human readable format
const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
}

interface Job {
  id: string
  state: string
  progress: number
  data: {
    jobType?: string
    volumeType?: string
    totalCount?: number
    processedCount?: number
    recordsPerSecond?: number
    elapsedTimeSeconds?: number
    estimatedRemainingTimeMs?: number
    estimatedFinishTime?: string
    memoryUsageMB?: number
    [key: string]: any
  }
  timestamp: number
  processedOn?: number
  finishedOn?: number
  failedReason?: string
}

interface JobStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

interface JobsResponse {
  jobs: Job[]
  stats: JobStats
  totalJobs: number
}

export default function BackgroundJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<JobStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchJobs = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const data: JobsResponse = await response.json()
        setJobs(data.jobs)
        setStats(data.stats)
        setError(null)
      } else {
        setError('Failed to fetch jobs')
      }
    } catch (err) {
      setError('Error fetching jobs')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const deleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs?jobId=${jobId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        // Remove job from local state
        setJobs(prev => prev.filter(job => job.id !== jobId))
      } else {
        setError('Failed to delete job')
      }
    } catch (err) {
      setError('Error deleting job')
    }
  }

  useEffect(() => {
    fetchJobs()
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchJobs()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'active':
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'waiting':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'active':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processing</Badge>
      case 'waiting':
        return <Badge variant="outline" className="text-yellow-600">Queued</Badge>
      default:
        return <Badge variant="outline">{state}</Badge>
    }
  }

  const getJobTypeIcon = (jobType: string) => {
    switch (jobType) {
      case 'forecast':
        return <TrendingUp className="h-4 w-4" />
      case 'actuals':
        return <Database className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-glass">
        <div className="glass-card dark:glass-card-dark p-6 rounded-glass shadow-glass border-white/20">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading background jobs...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-glass">
      {/* Header */}
      <div className="glass-card dark:glass-card-dark p-6 rounded-glass shadow-glass border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Background Jobs
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor and manage BigQuery data synchronization jobs
            </p>
          </div>
          <Button 
            onClick={fetchJobs} 
            disabled={refreshing}
            className="gradient-primary hover:scale-105 transition-glass"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="glass-card dark:glass-card-dark border-red-200/50 dark:border-red-800/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Redis Status */}
      <RedisStatus />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Waiting</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.waiting}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
                </div>
                <Play className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jobs List */}
      <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20">
        <CardHeader className="border-b border-white/20">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-primary shadow-glass flex items-center justify-center">
              <Database className="h-4 w-4 text-white" />
            </div>
            Recent Jobs ({jobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No background jobs found</p>
              <p className="text-sm">Jobs will appear here when BigQuery sync operations are queued</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 hover-glass dark:hover-glass-dark transition-glass">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStateIcon(job.state)}
                      <div className="flex items-center gap-2">
                        {getJobTypeIcon(job.data?.jobType)}
                        <span className="font-medium">
                          {job.data?.jobType === 'forecast' ? 'Forecast Sync' : 'Actuals Sync'}
                        </span>
                      </div>
                      {getStateBadge(job.state)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(job.timestamp, { addSuffix: true })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteJob(job.id)}
                        className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Job ID:</span>
                      <span className="ml-2 font-mono text-xs">{job.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Volume Type:</span>
                      <span className="ml-2">{job.data?.volumeType || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Records:</span>
                      <span className="ml-2">{job.data?.totalCount?.toLocaleString() || 'Unknown'}</span>
                    </div>
                  </div>

                  {/* Enhanced Progress Information for Active Jobs */}
                  {job.state === 'active' && job.data && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div>
                          <span className="text-muted-foreground">Processed:</span>
                          <div className="font-semibold text-blue-700 dark:text-blue-300">
                            {job.data.processedCount?.toLocaleString() || '0'} / {job.data.totalCount?.toLocaleString() || '0'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Processing Rate:</span>
                          <div className="font-semibold text-green-700 dark:text-green-300">
                            {job.data.recordsPerSecond?.toLocaleString() || '0'} records/sec
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Elapsed Time:</span>
                          <div className="font-semibold">
                            {job.data.elapsedTimeSeconds ? formatDuration(job.data.elapsedTimeSeconds) : '0s'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Memory Usage:</span>
                          <div className="font-semibold text-purple-700 dark:text-purple-300">
                            {job.data.memoryUsageMB || 0} MB
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                          <span className="text-muted-foreground">Estimated Time Remaining:</span>
                          <div className="font-semibold text-amber-700 dark:text-amber-300">
                            {job.data.estimatedRemainingTimeMs ? 
                              formatDuration(Math.round(job.data.estimatedRemainingTimeMs / 1000)) : 
                              'Calculating...'
                            }
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <span className="text-muted-foreground">Estimated Finish Time:</span>
                          <div className="font-semibold text-green-700 dark:text-green-300">
                            {job.data.estimatedFinishTime ? 
                              new Date(job.data.estimatedFinishTime).toLocaleString() : 
                              'Calculating...'
                            }
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {job.state === 'active' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{job.progress || 0}%</span>
                      </div>
                      <Progress value={job.progress || 0} className="h-2" />
                    </div>
                  )}

                  {job.failedReason && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                        Error Details
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-300 font-mono">
                        {job.failedReason}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 