'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Database, Upload, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { ForecastComparisonModel } from '@/types/forecast-comparison'
import { format } from 'date-fns'

interface ActualsDatasetConfigProps {
  comparisonModelId: string
  currentModel: ForecastComparisonModel
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
}

interface ConnectionTest {
  success: boolean
  message: string
  recordCount?: number
  preview?: any[]
}

export function ActualsDatasetConfig({ comparisonModelId, currentModel, onSuccess, onError }: ActualsDatasetConfigProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [connectionTest, setConnectionTest] = useState<ConnectionTest | null>(null)

  // Initialize with model's period dates
  useEffect(() => {
    if (currentModel) {
      setError(null)
      setSuccess(null)
      setConnectionTest(null)
    }
  }, [currentModel])

  const ensureActualsDatasetExists = async () => {
    // First check if actualsDataset already exists
    if (currentModel?.actualsDataset) {
      return true
    }

    // Create actuals dataset if it doesn't exist
    try {
      const response = await fetch(`/api/forecast-comparison-models/${comparisonModelId}/actuals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${currentModel?.name || 'Model'} - Actuals Data`,
          dataSource: 'BIGQUERY',
          bigqueryTable: 'vActualVolume'
        })
      })

      if (response.ok) {
        return true
      } else if (response.status === 409) {
        // Dataset already exists, that's fine
        return true
      } else {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create actuals dataset')
      }
    } catch (error: any) {
      throw new Error(`Failed to ensure actuals dataset: ${error.message}`)
    }
  }

  const testConnection = async () => {
    if (!currentModel?.period_start || !currentModel?.period_end) {
      setError('Model period dates are not configured')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Ensure actuals dataset exists first
      await ensureActualsDatasetExists()

      // Use the separate test endpoint for connection testing (doesn't start data processing)
      const response = await fetch(`/api/forecast-comparison-models/${comparisonModelId}/actuals/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: format(new Date(currentModel.period_start), 'yyyy-MM-dd'),
          endDate: format(new Date(currentModel.period_end), 'yyyy-MM-dd')
        })
      })

      const result = await response.json()

      if (response.ok) {
        setConnectionTest({
          success: true,
          message: `Query successful! Found ${result.recordCount || 0} records`,
          recordCount: result.recordCount,
          preview: result.data
        })
        setSuccess('BigQuery actuals query successful!')
        toast.success('BigQuery actuals query successful')
      } else {
        setConnectionTest({
          success: false,
          message: result.error || 'Connection failed'
        })
        setError(result.error || 'Connection test failed')
        toast.error('BigQuery actuals connection test failed')
      }
    } catch (error: any) {
      setConnectionTest({
        success: false,
        message: error.message || 'Connection test failed'
      })
      setError(`Connection test failed: ${error.message}`)
      toast.error('Connection test failed')
    } finally {
      setIsLoading(false)
    }
  }

  const startSync = async () => {
    if (!currentModel?.period_start || !currentModel?.period_end) {
      setError('Model period dates are not configured')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Ensure actuals dataset exists first
      await ensureActualsDatasetExists()

      const response = await fetch(`/api/forecast-comparison-models/${comparisonModelId}/actuals/bigquery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: format(new Date(currentModel.period_start), 'yyyy-MM-dd'),
          endDate: format(new Date(currentModel.period_end), 'yyyy-MM-dd')
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(`Successfully synced ${result.recordCount?.toLocaleString() || 0} actuals records`)
        toast.success('Actuals data sync completed')
        onSuccess?.(result)
      } else {
        const errorMessage = result.error || 'Sync failed'
        setError(errorMessage)
        
        if (response.status === 409) {
          toast.error('Job already in progress')
        } else {
          toast.error('Actuals data sync failed')
        }
        
        onError?.(errorMessage)
      }
    } catch (error: any) {
      setError(`Sync failed: ${error.message}`)
      toast.error('Actuals data sync failed')
      onError?.(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Actuals Data Configuration
          </CardTitle>
          <CardDescription>
            Configure the actuals data extraction from BigQuery using the model's defined period.
            <br />
            <span className="text-amber-600 font-medium">Note: Running this will overwrite any existing actuals data for this model.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Period Information */}
          <div className="p-4 bg-muted rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Model Period</Label>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Start Date:</span>
                <span className="ml-2 font-medium">
                  {currentModel?.period_start ? format(new Date(currentModel.period_start), 'MMM dd, yyyy') : 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">End Date:</span>
                <span className="ml-2 font-medium">
                  {currentModel?.period_end ? format(new Date(currentModel.period_end), 'MMM dd, yyyy') : 'Not set'}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              BigQuery queries will automatically use these dates for the partition range
            </p>
          </div>

          {/* Connection Test Results */}
          {connectionTest && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {connectionTest.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  {connectionTest.message}
                </span>
              </div>
              
              {connectionTest.success && connectionTest.recordCount !== undefined && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <div className="text-sm text-muted-foreground">
                    <p>• Total records: {connectionTest.recordCount.toLocaleString()}</p>
                    <p>• Date range: {format(new Date(currentModel.period_start), 'yyyy-MM-dd')} to {format(new Date(currentModel.period_end), 'yyyy-MM-dd')}</p>
                    <p>• Data source: vActualVolume (with business structure join)</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={testConnection}
          disabled={isLoading || !currentModel?.period_start || !currentModel?.period_end}
          variant="outline"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Database className="h-4 w-4 mr-2" />
          )}
          Test Connection
        </Button>

        <Button
          onClick={startSync}
          disabled={
            isLoading || 
            !currentModel?.period_start || 
            !currentModel?.period_end ||
            currentModel?.actualsDataset?.loadStatus === 'PROCESSING' ||
            currentModel?.actualsDataset?.loadStatus === 'QUEUED'
          }
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {isLoading 
            ? 'Syncing...' 
            : currentModel?.actualsDataset?.loadStatus === 'PROCESSING'
              ? 'Processing...'
              : currentModel?.actualsDataset?.loadStatus === 'QUEUED'
                ? 'Queued...'
                : 'Start Sync (Overwrites Existing Data)'
          }
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
} 