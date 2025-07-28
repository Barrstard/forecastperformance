"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { JobProgress } from '@/components/ui/job-progress'
import { Database, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface ForecastDatasetConfigProps {
  currentModel: any
  datasetId: string
  environmentId: string
  onSuccess: () => void
  onError: (error: string) => void
}

export function ForecastDatasetConfig({ 
  currentModel, 
  datasetId, 
  environmentId, 
  onSuccess, 
  onError 
}: ForecastDatasetConfigProps) {
  const [volumeType, setVolumeType] = useState('GENERATED')
  const [dateRange, setDateRange] = useState({
    startDate: currentModel?.period_start ? new Date(currentModel.period_start).toISOString().split('T')[0] : '',
    endDate: currentModel?.period_end ? new Date(currentModel.period_end).toISOString().split('T')[0] : ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null)
  const [backgroundProcessing, setBackgroundProcessing] = useState(false)

  const testConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch(`/api/forecast-comparison-models/${currentModel.id}/forecasts/${datasetId}/bigquery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          volumeType,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.backgroundProcessing) {
          setBackgroundJobId(data.jobId)
          setBackgroundProcessing(true)
          setTestResult({
            success: true,
            message: `Large dataset detected (${data.recordCount.toLocaleString()} records). Background processing started. Job ID: ${data.jobId}`
          })
        } else {
          setTestResult({
            success: true,
            message: `Successfully processed ${data.recordCount.toLocaleString()} records`
          })
          onSuccess()
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Test failed'
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const startSync = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/forecast-comparison-models/${currentModel.id}/forecasts/${datasetId}/bigquery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          volumeType,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.backgroundProcessing) {
          setBackgroundJobId(data.jobId)
          setBackgroundProcessing(true)
        } else {
          onSuccess()
        }
      } else {
        onError(data.error || 'Sync failed')
      }
    } catch (error) {
      onError('Sync failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJobComplete = () => {
    setBackgroundProcessing(false)
    setBackgroundJobId(null)
    onSuccess()
  }

  const handleJobError = (error: string) => {
    setBackgroundProcessing(false)
    setBackgroundJobId(null)
    onError(error)
  }

  return (
    <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg gradient-primary">
            <Database className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold">Forecast Data Configuration</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="volumeType">Volume Type</Label>
            <Select value={volumeType} onValueChange={setVolumeType}>
              <SelectTrigger className="glass-input dark:glass-input-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERATED">Generated</SelectItem>
                <SelectItem value="ADJUSTED">Adjusted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="glass-input dark:glass-input-dark"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="glass-input dark:glass-input-dark"
            />
          </div>
        </div>

        <Alert className="glass-input dark:glass-input-dark border-orange-200/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Large datasets will be processed in the background. Existing data will be overwritten.
          </AlertDescription>
        </Alert>

        {testResult && (
          <Alert className={testResult.success ? "glass-input dark:glass-input-dark border-green-200/50" : "glass-input dark:glass-input-dark border-red-200/50"}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription className={testResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}

        {backgroundJobId && backgroundProcessing && (
          <JobProgress 
            jobId={backgroundJobId}
            onComplete={handleJobComplete}
            onError={handleJobError}
          />
        )}

        <div className="flex gap-2">
          <Button
            onClick={testConnection}
            disabled={isTesting || !dateRange.startDate || !dateRange.endDate}
            variant="outline"
            className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>

          <Button
            onClick={startSync}
            disabled={isLoading || !dateRange.startDate || !dateRange.endDate || backgroundProcessing}
            className="gradient-primary hover:scale-105 transition-glass"
          >
            {isLoading ? 'Starting Sync...' : 'Start Sync'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 