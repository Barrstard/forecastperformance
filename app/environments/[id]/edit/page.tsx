"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Database, FileText, Settings, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEnvironmentStore } from '@/stores/environment-store'

export default function EditEnvironmentPage() {
  const router = useRouter()
  const params = useParams()
  const environmentId = params.id as string
  const { updateEnvironment } = useEnvironmentStore()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    bigqueryCredentials: '',
    bigqueryDataset: '',
    ukgProUrl: '',
    ukgProClientId: '',
    ukgProClientSecret: '',
    ukgProAppKey: '',
    ukgProUsername: '',
    ukgProPassword: ''
  })

  const [connectionTest, setConnectionTest] = useState<{
    bigquery: { 
      success: boolean; 
      message: string; 
      projectId?: string;
      availableDatasets?: string[];
      suggestions?: string[];
    } | null
    dimensions: { 
      success: boolean; 
      message: string;
      error?: string;
    } | null
  }>({
    bigquery: null,
    dimensions: null
  })

  useEffect(() => {
    fetchEnvironment()
  }, [environmentId])

  const fetchEnvironment = async () => {
    try {
      const response = await fetch(`/api/environments/${environmentId}`)
      if (response.ok) {
        const environment = await response.json()
        
        // Parse credentials if they exist
        let credentials = ''
        if (environment.bigqueryCredentials) {
          try {
            credentials = typeof environment.bigqueryCredentials === 'string' 
              ? environment.bigqueryCredentials 
              : JSON.stringify(environment.bigqueryCredentials, null, 2)
          } catch (e) {
            console.error('Failed to parse credentials:', e)
          }
        }

        setFormData({
          name: environment.name || '',
          bigqueryCredentials: credentials,
          bigqueryDataset: environment.bigqueryDataset || '',
          ukgProUrl: environment.ukgProUrl || '',
          ukgProClientId: environment.ukgProClientId || '',
          ukgProClientSecret: environment.ukgProClientSecret || '',
          ukgProAppKey: environment.ukgProAppKey || '',
          ukgProUsername: environment.ukgProUsername || '',
          ukgProPassword: environment.ukgProPassword || ''
        })
      } else {
        setError('Failed to load environment')
      }
    } catch (error) {
      console.error('Failed to fetch environment:', error)
      setError('Failed to load environment')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/json') {
      toast.error('Please select a JSON file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parsed = JSON.parse(content)
        
        // Validate that it's a BigQuery service account JSON
        if (!parsed.type || !parsed.project_id || !parsed.private_key) {
          toast.error('Invalid BigQuery service account JSON file')
          return
        }

        setFormData(prev => ({ ...prev, bigqueryCredentials: content }))
        toast.success('BigQuery credentials loaded successfully')
      } catch (error) {
        toast.error('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  const testBigQueryConnection = async () => {
    if (!formData.bigqueryCredentials) {
      setError('Please provide BigQuery credentials first')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const credentials = JSON.parse(formData.bigqueryCredentials)
      const response = await fetch('/api/bigquery/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          credentials,
          dataset: formData.bigqueryDataset 
        })
      })

      const result = await response.json()

      if (result.success) {
        setConnectionTest(prev => ({
          ...prev,
          bigquery: { 
            success: true, 
            message: `Connected to project: ${result.projectId}, dataset: ${result.dataset}`,
            projectId: result.projectId,
            availableDatasets: result.availableTables
          }
        }))
        setSuccess('BigQuery connection successful!')
      } else {
        setConnectionTest(prev => ({
          ...prev,
          bigquery: { 
            success: false, 
            message: result.error,
            projectId: result.projectId,
            suggestions: result.suggestions
          }
        }))
        setError(`BigQuery connection failed: ${result.error}`)
      }
    } catch (error: any) {
      setConnectionTest(prev => ({
        ...prev,
        bigquery: { success: false, message: error.message }
      }))
      setError(`BigQuery connection failed: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const testUKGProConnection = async () => {
    if (!formData.ukgProUrl || !formData.ukgProClientId || !formData.ukgProClientSecret || !formData.ukgProAppKey || !formData.ukgProUsername || !formData.ukgProPassword) {
      setError('Please provide all UKG Pro credentials')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/dimensions/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.ukgProUrl,
          clientId: formData.ukgProClientId,
          clientSecret: formData.ukgProClientSecret,
          appKey: formData.ukgProAppKey,
          username: formData.ukgProUsername,
          password: formData.ukgProPassword
        })
      })

      const result = await response.json()

      if (result.success) {
        setConnectionTest(prev => ({
          ...prev,
          dimensions: { 
            success: true, 
            message: 'Dimensions connection successful!'
          }
        }))
        setSuccess('UKG Pro connection successful!')
      } else {
        setConnectionTest(prev => ({
          ...prev,
          dimensions: { 
            success: false, 
            message: result.error,
            error: result.error
          }
        }))
        setError(result.error)
      }
    } catch (error: any) {
      setConnectionTest(prev => ({
        ...prev,
        dimensions: { 
          success: false, 
          message: error.message,
          error: error.message
        }
      }))
      setError(`UKG Pro connection failed: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const credentials = JSON.parse(formData.bigqueryCredentials)
      const response = await fetch(`/api/environments/${environmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          bigqueryProjectId: credentials.project_id,
          bigqueryDataset: formData.bigqueryDataset,
          bigqueryCredentials: credentials,
          ukgProUrl: formData.ukgProUrl || undefined,
          ukgProClientId: formData.ukgProClientId || undefined,
          ukgProClientSecret: formData.ukgProClientSecret || undefined,
          ukgProAppKey: formData.ukgProAppKey || undefined,
          ukgProUsername: formData.ukgProUsername || undefined,
          ukgProPassword: formData.ukgProPassword || undefined
        })
      })

      const result = await response.json()

      if (response.ok) {
        // Update the store
        updateEnvironment(environmentId, {
          name: formData.name,
          bigqueryProjectId: credentials.project_id,
          bigqueryDataset: formData.bigqueryDataset,
          bigqueryCredentials: credentials,
          ukgProUrl: formData.ukgProUrl || undefined,
          ukgProClientId: formData.ukgProClientId || undefined,
          ukgProClientSecret: formData.ukgProClientSecret || undefined,
          ukgProAppKey: formData.ukgProAppKey || undefined,
          ukgProUsername: formData.ukgProUsername || undefined,
          ukgProPassword: formData.ukgProPassword || undefined
        })
        
        setSuccess('Environment updated successfully!')
        setTimeout(() => {
          router.push('/environments')
        }, 1500)
      } else {
        setError(result.error || 'Failed to update environment')
      }
    } catch (error: any) {
      setError(`Failed to update environment: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Edit Environment</h1>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading environment...</span>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      {/* Full width container with proper responsive padding */}
      <div className="w-full h-full flex flex-col">
        {/* Header Section */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edit Environment</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Update BigQuery and UKG Pro connections
              </p>
            </div>
          </div>
        </div>

        {/* Form Section - Full width scrollable content */}
        <div className="flex-1 overflow-auto">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 w-full">
            
            {/* Environment Name */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Update the environment name and basic configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="name">Environment Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Production, Development, Testing"
                    required
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* BigQuery Configuration */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  BigQuery Configuration
                </CardTitle>
                <CardDescription>
                  Update your BigQuery service account credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label>Upload BigQuery Service Account JSON</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('bigqueryFile')?.click()}
                      disabled={isSaving}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {formData.bigqueryCredentials ? 'File uploaded ✓' : 'No file selected'}
                    </span>
                  </div>
                  <input
                    id="bigqueryFile"
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Dataset Name */}
                <div className="space-y-2">
                  <Label htmlFor="bigqueryDataset">BigQuery Dataset Name (Optional)</Label>
                  <Input
                    id="bigqueryDataset"
                    value={formData.bigqueryDataset}
                    onChange={(e) => handleInputChange('bigqueryDataset', e.target.value)}
                    placeholder="Leave empty to auto-detect dataset containing 'detail'"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to automatically detect the dataset containing 'detail' in the name, or specify a custom dataset
                  </p>
                </div>

                {/* JSON Textarea */}
                <div className="space-y-2">
                  <Label htmlFor="bigqueryCredentials">BigQuery Service Account JSON</Label>
                  <Textarea
                    id="bigqueryCredentials"
                    value={formData.bigqueryCredentials}
                    onChange={(e) => handleInputChange('bigqueryCredentials', e.target.value)}
                    placeholder='{"type": "service_account", "project_id": "...", "private_key": "..."}'
                    rows={8}
                    className="font-mono text-sm w-full"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your BigQuery service account JSON credentials here or upload a JSON file above
                  </p>
                </div>

                {/* Test Connection */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testBigQueryConnection}
                    disabled={isSaving || !formData.bigqueryCredentials}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                  {connectionTest.bigquery && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {connectionTest.bigquery.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {connectionTest.bigquery.message}
                        </span>
                      </div>
                      
                      {/* Show suggestions for failed connections */}
                      {!connectionTest.bigquery.success && connectionTest.bigquery.suggestions && (
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-2">Suggestions:</p>
                          <ul className="text-sm space-y-1">
                            {connectionTest.bigquery.suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Show available datasets for successful connections */}
                      {connectionTest.bigquery.success && connectionTest.bigquery.availableDatasets && (
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-2">Available tables in dataset:</p>
                          <div className="text-sm text-muted-foreground">
                            {connectionTest.bigquery.availableDatasets.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* UKG Pro Configuration */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  UKG Pro Workforce Management Configuration
                  <Badge variant="secondary">Optional</Badge>
                </CardTitle>
                <CardDescription>
                  Update UKG Pro WFM API settings for job orchestration (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ukgProUrl">UKG Pro URL</Label>
                  <Input
                    id="ukgProUrl"
                    value={formData.ukgProUrl}
                    onChange={(e) => handleInputChange('ukgProUrl', e.target.value)}
                    placeholder="https://your-company.npr.mykronos.net/wfc/api/v1/"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    The full URL to your UKG Pro WFM API (e.g., https://company.npr.mykronos.net/wfc/api/v1/)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ukgProClientId">Client ID</Label>
                  <Input
                    id="ukgProClientId"
                    value={formData.ukgProClientId}
                    onChange={(e) => handleInputChange('ukgProClientId', e.target.value)}
                    placeholder="Your UKG Pro Client ID"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    The OAuth2 client ID for your UKG Pro application
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ukgProClientSecret">Client Secret</Label>
                  <Input
                    id="ukgProClientSecret"
                    type="password"
                    value={formData.ukgProClientSecret}
                    onChange={(e) => handleInputChange('ukgProClientSecret', e.target.value)}
                    placeholder="Your UKG Pro Client Secret"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    The OAuth2 client secret for your UKG Pro application
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ukgProAppKey">App Key</Label>
                  <Input
                    id="ukgProAppKey"
                    value={formData.ukgProAppKey}
                    onChange={(e) => handleInputChange('ukgProAppKey', e.target.value)}
                    placeholder="Your UKG Pro App Key"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    The application key for your UKG Pro integration
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ukgProUsername">Username</Label>
                  <Input
                    id="ukgProUsername"
                    value={formData.ukgProUsername}
                    onChange={(e) => handleInputChange('ukgProUsername', e.target.value)}
                    placeholder="APIUSERATEO"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    The username for UKG Pro API authentication
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ukgProPassword">Password</Label>
                  <Input
                    id="ukgProPassword"
                    type="password"
                    value={formData.ukgProPassword}
                    onChange={(e) => handleInputChange('ukgProPassword', e.target.value)}
                    placeholder="Your UKG Pro Password"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    The password for UKG Pro API authentication
                  </p>
                </div>

                {/* Test Connection */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testUKGProConnection}
                    disabled={isSaving || !formData.ukgProUrl || !formData.ukgProClientId || !formData.ukgProClientSecret || !formData.ukgProAppKey || !formData.ukgProUsername || !formData.ukgProPassword}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Test UKG Pro Connection
                  </Button>
                  
                  {connectionTest.dimensions && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {connectionTest.dimensions.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {connectionTest.dimensions.message}
                        </span>
                      </div>
                      
                      {/* Show error details for failed connections */}
                      {!connectionTest.dimensions.success && connectionTest.dimensions.error && (
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-2">Error Details:</p>
                          <div className="text-sm text-muted-foreground">
                            {connectionTest.dimensions.error}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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

            {/* Submit Button */}
            <div className="flex gap-4 flex-wrap">
              <Button
                type="submit"
                disabled={isSaving || !formData.name || !formData.bigqueryCredentials}
              >
                {isSaving ? 'Updating...' : 'Update Environment'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  )
} 