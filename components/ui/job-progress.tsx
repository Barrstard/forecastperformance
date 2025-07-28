"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, XCircle, Clock, Play } from 'lucide-react'

interface JobProgressProps {
  jobId: string
  onComplete?: () => void
  onError?: (error: string) => void
}

interface JobStatus {
  jobId: string
  state: string
  progress: number
  failedReason: string | null
  data: any
  timestamp: string
}

export function JobProgress({ jobId, onComplete, onError }: JobProgressProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobStatus = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`)
      if (response.ok) {
        const data = await response.json()
        setJobStatus(data)
        setError(null)
        
        // Check if job is completed or failed
        if (data.state === 'completed') {
          onComplete?.()
        } else if (data.state === 'failed') {
          onError?.(data.failedReason || 'Job failed')
        }
      } else {
        setError('Failed to fetch job status')
      }
    } catch (err) {
      setError('Error fetching job status')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchJobStatus()
    
    // Poll for updates every 2 seconds
    const interval = setInterval(() => {
      if (jobStatus?.state === 'active' || jobStatus?.state === 'waiting') {
        fetchJobStatus()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, jobStatus?.state])

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

  if (isLoading) {
    return (
      <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading job status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-red-200/50 dark:border-red-800/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-600 dark:text-red-400">{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchJobStatus}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!jobStatus) {
    return (
      <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No job status available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStateIcon(jobStatus.state)}
            <span>Background Job Progress</span>
          </div>
          {getStateBadge(jobStatus.state)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{jobStatus.progress}%</span>
          </div>
          <Progress value={jobStatus.progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Job ID</div>
            <div className="font-mono text-xs">{jobStatus.jobId}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Job Type</div>
            <div className="font-medium">{jobStatus.data?.jobType || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Records</div>
            <div className="font-medium">
              {jobStatus.data?.totalCount?.toLocaleString() || 'Unknown'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Last Update</div>
            <div className="font-medium">
              {new Date(jobStatus.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {jobStatus.failedReason && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
              Error Details
            </div>
            <div className="text-xs text-red-600 dark:text-red-300 font-mono">
              {jobStatus.failedReason}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchJobStatus}
            disabled={jobStatus.state === 'active'}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 