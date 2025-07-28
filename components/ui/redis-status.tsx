"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, CheckCircle, XCircle, Database } from 'lucide-react'

interface RedisStatusProps {
  className?: string
}

interface RedisTestResponse {
  success: boolean
  message: string
  stats?: any
  error?: string
  timestamp: string
}

export function RedisStatus({ className }: RedisStatusProps) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const testConnection = async () => {
    try {
      setTesting(true)
      setError(null)
      
      const response = await fetch('/api/test-redis')
      const data: RedisTestResponse = await response.json()
      
      if (data.success) {
        setStatus('connected')
        setStats(data.stats)
      } else {
        setStatus('error')
        setError(data.error || 'Connection failed')
      }
    } catch (err) {
      setStatus('error')
      setError('Failed to test connection')
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
      case 'error':
        return <Badge variant="destructive">Connection Failed</Badge>
      default:
        return <Badge variant="outline">Testing...</Badge>
    }
  }

  return (
    <Card className={`glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 ${className}`}>
      <CardHeader className="border-b border-white/20">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-primary shadow-glass flex items-center justify-center">
              <Database className="h-3 w-3 text-white" />
            </div>
            Redis Status
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Connection Status</span>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">
                {status === 'connected' ? 'Connected' : status === 'error' ? 'Failed' : 'Testing...'}
              </span>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Active Jobs:</span>
                <span className="ml-2 font-medium">{stats.active || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Waiting Jobs:</span>
                <span className="ml-2 font-medium">{stats.waiting || 0}</span>
              </div>
            </div>
          )}

          {error && (
            <Alert className="border-red-200/50 dark:border-red-800/50">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testing}
              className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${testing ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 