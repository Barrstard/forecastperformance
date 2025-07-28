'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft, 
  Plus, 
  Upload, 
  Database, 
  FileText, 
  Play, 
  BarChart3,
  Calendar,
  Settings,
  AlertCircle,
  X
} from 'lucide-react'
import { useForecastComparisonStore } from '@/stores/forecast-comparison-store'
import { forecastComparisonApi } from '@/lib/forecast-comparison-api'
import { ForecastComparisonModel, ActualsDataset, ForecastDataset, ComparisonRun } from '@/types/forecast-comparison'
import { format } from 'date-fns'
import { ForecastDatasetConfig } from '@/components/forms/forecast-dataset-config'
import { ActualsDatasetConfig } from '@/components/forms/actuals-dataset-config'

export default function ForecastModelDetailPage() {
  const params = useParams()
  const router = useRouter()
  const modelId = params.id as string
  
  // Use store getters directly to avoid infinite loops
  const store = useForecastComparisonStore()
  const currentModel = store.getCurrentModel()
  const loading = store.loading
  const error = store.error
  const actualsDataset = currentModel?.actualsDataset || null
  const forecastDatasets = currentModel?.forecastDatasets || []
  const comparisonRuns = currentModel?.comparisonRuns || []
  
  console.log('Store object:', store)
  console.log('Store functions:', {
    fetchModelDetails: typeof store.fetchModelDetails,
    fetchActualsDataset: typeof store.fetchActualsDataset,
    fetchForecastDatasets: typeof store.fetchForecastDatasets,
    fetchComparisonRuns: typeof store.fetchComparisonRuns
  })
  
  // Access store functions directly to avoid infinite loops

  console.log('Component state:', { 
    modelId, 
    currentModel, 
    loading, 
    error,
    actualsDataset,
    forecastDatasets: forecastDatasets.length,
    comparisonRuns: comparisonRuns.length
  })

  const [activeTab, setActiveTab] = useState('overview')
  const [showForecastConfig, setShowForecastConfig] = useState(false)
  const [showActualsConfig, setShowActualsConfig] = useState(false)
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)

  useEffect(() => {
    console.log('useEffect triggered with modelId:', modelId)
    console.log('Store functions available:', {
      fetchModelDetails: !!store.fetchModelDetails,
      fetchActualsDataset: !!store.fetchActualsDataset,
      fetchForecastDatasets: !!store.fetchForecastDatasets,
      fetchComparisonRuns: !!store.fetchComparisonRuns
    })
    
    if (modelId) {
      console.log('Calling fetchModelDetails...')
      
      const loadModelData = async () => {
        try {
          // First fetch the model details and wait for it to complete
          await store.fetchModelDetails(modelId)
          console.log('Model details fetched successfully')
          
          // Then fetch the related data
          await Promise.all([
            store.fetchActualsDataset(modelId),
            store.fetchForecastDatasets(modelId),
            store.fetchComparisonRuns(modelId)
          ])
          
          console.log('All model data loaded successfully')
        } catch (error) {
          console.error('Error calling store functions:', error)
        }
      }
      
      loadModelData()
    }
  }, [modelId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800'
      case 'ARCHIVED': return 'bg-gray-100 text-gray-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getLoadStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'LOADING': return 'bg-blue-100 text-blue-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'VALIDATING': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAddForecastModel = async () => {
    try {
             const newDataset = await forecastComparisonApi.createForecastDataset(modelId, {
         name: `Forecast Model ${forecastDatasets.length + 1}`,
         modelType: 'MACHINE_LEARNING',
         dataSource: 'BIGQUERY'
       })
      setSelectedDatasetId(newDataset.id)
      setShowForecastConfig(true)
      // Refresh the forecast datasets
      store.fetchForecastDatasets(modelId)
    } catch (error) {
      console.error('Failed to create forecast dataset:', error)
    }
  }

  const handleForecastConfigSuccess = () => {
    setShowForecastConfig(false)
    setSelectedDatasetId(null)
    // Refresh the forecast datasets
    store.fetchForecastDatasets(modelId)
  }

  const handleForecastConfigError = (error: string) => {
    console.error('Forecast config error:', error)
  }

  const handleActualsConfigSuccess = () => {
    console.log('Actuals config success')
    setShowActualsConfig(false)
    // Refresh the model data
    store.fetchModelDetails(modelId)
  }

  const handleActualsConfigError = (error: string) => {
    console.error('Actuals config error:', error)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (error || !currentModel) {
    console.log('Rendering error state:', { error, currentModel, loading })
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        

        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
                             <span>Error loading forecast model: {error || 'Model not found'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-glass">
      {/* Header */}
      <div className="flex items-center justify-between glass-card dark:glass-card-dark p-6 rounded-glass shadow-glass">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
                         <h1 className="text-2xl font-bold">{currentModel.name}</h1>
             <p className="text-muted-foreground">{currentModel.description}</p>
          </div>
        </div>
                 <Badge className={getStatusColor(currentModel.status)}>
           {currentModel.status}
         </Badge>
      </div>

      {/* Model Overview Card */}
      <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20">
        <CardHeader className="border-b border-white/20">
          <CardTitle className="flex items-center space-x-2">
            <div className="p-2 rounded-lg gradient-primary">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold">Model Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Environment</label>
                             <p className="text-sm">{currentModel.environment?.name || 'Unknown'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Period Start</label>
                             <p className="text-sm">{format(new Date(currentModel.period_start), 'MMM dd, yyyy')}</p>
             </div>
             <div className="space-y-2">
               <label className="text-sm font-medium text-muted-foreground">Period End</label>
               <p className="text-sm">{format(new Date(currentModel.period_end), 'MMM dd, yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 glass-input dark:glass-input-dark p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg transition-glass">Overview</TabsTrigger>
            <TabsTrigger value="actuals" className="rounded-lg transition-glass">Actuals Data</TabsTrigger>
            <TabsTrigger value="forecasts" className="rounded-lg transition-glass">Forecast Models</TabsTrigger>
            <TabsTrigger value="runs" className="rounded-lg transition-glass">Comparison Runs</TabsTrigger>
          </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Actuals Status */}
            <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
              <CardHeader className="pb-3 border-b border-white/20">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg gradient-secondary">
                    <Database className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold">Actuals Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                                 {actualsDataset ? (
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-sm font-medium">{actualsDataset.name}</span>
                       <Badge className={getLoadStatusColor(actualsDataset.loadStatus)}>
                         {actualsDataset.loadStatus}
                       </Badge>
                     </div>
                     <p className="text-xs text-muted-foreground">
                       {actualsDataset.recordCount?.toLocaleString() || 0} records
                     </p>
                   </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">No actuals data loaded</p>
                    <Button size="sm" onClick={() => setActiveTab('actuals')} className="gradient-primary hover:scale-105 transition-glass">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Actuals
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Forecast Models Status */}
            <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
              <CardHeader className="pb-3 border-b border-white/20">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg gradient-primary">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold">Forecast Models</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                                 {forecastDatasets.length > 0 ? (
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-sm font-medium">{forecastDatasets.length} models</span>
                     </div>
                     <div className="space-y-1">
                       {forecastDatasets.slice(0, 2).map((dataset: any) => (
                         <div key={dataset.id} className="flex items-center justify-between text-xs">
                           <span className="truncate">{dataset.name}</span>
                           <Badge className={getLoadStatusColor(dataset.loadStatus)}>
                             {dataset.loadStatus}
                           </Badge>
                         </div>
                       ))}
                       {forecastDatasets.length > 2 && (
                         <p className="text-xs text-muted-foreground">
                           +{forecastDatasets.length - 2} more
                         </p>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">No forecast models</p>
                    <Button size="sm" onClick={() => {
                      setActiveTab('forecasts')
                      handleAddForecastModel()
                    }} className="gradient-primary hover:scale-105 transition-glass">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Forecast
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comparison Runs Status */}
            <Card className="glass-card dark:glass-card-dark rounded-glass shadow-glass border-white/20 hover-glass dark:hover-glass-dark transition-glass">
              <CardHeader className="pb-3 border-b border-white/20">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg gradient-accent">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold">Comparison Runs</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                                                 {comparisonRuns.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{comparisonRuns.length} runs</span>
                    </div>
                    <div className="space-y-1">
                      {comparisonRuns.slice(0, 2).map((run: any) => (
                         <div key={run.id} className="flex items-center justify-between text-xs">
                           <span className="truncate">{run.name}</span>
                           <Badge className={getStatusColor(run.status)}>
                             {run.status}
                           </Badge>
                         </div>
                       ))}
                       {comparisonRuns.length > 2 && (
                         <p className="text-xs text-muted-foreground">
                           +{comparisonRuns.length - 2} more
                         </p>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">No comparison runs</p>
                    <Button size="sm" onClick={() => setActiveTab('runs')} className="gradient-accent hover:scale-105 transition-glass">
                      <Plus className="h-4 w-4 mr-2" />
                      Start Run
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Actuals Tab */}
        <TabsContent value="actuals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Actuals Dataset</span>
              </CardTitle>
              <CardDescription>
                Load actual performance data for comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
                             {actualsDataset ? (
                 <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <h3 className="font-medium">{actualsDataset.name}</h3>
                       <p className="text-sm text-muted-foreground">
                         Source: {actualsDataset.dataSource}
                       </p>
                     </div>
                     <Badge className={getLoadStatusColor(actualsDataset.loadStatus)}>
                       {actualsDataset.loadStatus}
                     </Badge>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                       <span className="text-muted-foreground">Records:</span>
                       <span className="ml-2">{actualsDataset.recordCount?.toLocaleString() || 0}</span>
                     </div>
                     <div>
                       <span className="text-muted-foreground">Loaded:</span>
                       <span className="ml-2">
                         {actualsDataset.loadedAt ? format(new Date(actualsDataset.loadedAt), 'MMM dd, yyyy HH:mm') : 'Not loaded'}
                       </span>
                     </div>
                   </div>

                  <Separator />

                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowActualsConfig(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Reload Data
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Actuals Data</h3>
                  <p className="text-muted-foreground mb-4">
                    Load actual performance data to compare against forecasts
                  </p>
                  <div className="flex space-x-2 justify-center">
                    <Button onClick={() => setShowActualsConfig(true)}>
                      <Database className="h-4 w-4 mr-2" />
                      Load from BigQuery
                    </Button>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actuals Dataset Configuration */}
          {showActualsConfig && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Configure Actuals Data Loading</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowActualsConfig(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  Configure BigQuery connection and data loading parameters for actuals data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActualsDatasetConfig
                  comparisonModelId={modelId}
                  currentModel={currentModel}
                  onSuccess={handleActualsConfigSuccess}
                  onError={handleActualsConfigError}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Forecasts Tab */}
        <TabsContent value="forecasts" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Forecast Models</h2>
              <p className="text-muted-foreground">
                Manage forecast datasets for comparison
              </p>
            </div>
            <Button onClick={handleAddForecastModel}>
              <Plus className="h-4 w-4 mr-2" />
              Add Forecast Model
            </Button>
          </div>

                     {forecastDatasets.length > 0 ? (
             <div className="grid gap-4">
               {forecastDatasets.map((dataset: any) => (
                <Card key={dataset.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium">{dataset.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {dataset.modelType} • {dataset.dataSource}
                        </p>
                      </div>
                      <Badge className={getLoadStatusColor(dataset.loadStatus)}>
                        {dataset.loadStatus}
                      </Badge>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Records:</span>
                        <span className="ml-2">{dataset.recordCount?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <span className="ml-2">{dataset.modelType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Loaded:</span>
                        <span className="ml-2">
                          {dataset.loadedAt ? format(new Date(dataset.loadedAt), 'MMM dd, yyyy') : 'Not loaded'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedDatasetId(dataset.id)
                          setShowForecastConfig(true)
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Reload
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Forecast Models</h3>
                <p className="text-muted-foreground mb-4">
                  Add forecast models to compare against actuals
                </p>
                <div className="flex space-x-2 justify-center">
                  <Button onClick={handleAddForecastModel}>
                    <Database className="h-4 w-4 mr-2" />
                    Load from BigQuery
                  </Button>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Forecast Dataset Configuration */}
          {showForecastConfig && selectedDatasetId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Configure Forecast Data Loading</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForecastConfig(false)
                      setSelectedDatasetId(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  Configure BigQuery connection and data loading parameters for this forecast model
                </CardDescription>
              </CardHeader>
              <CardContent>
                                 <ForecastDatasetConfig
                   datasetId={selectedDatasetId}
                   environmentId={currentModel.environmentId}
                   currentModel={currentModel}
                   onSuccess={handleForecastConfigSuccess}
                   onError={handleForecastConfigError}
                 />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Runs Tab */}
        <TabsContent value="runs" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Comparison Runs</h2>
              <p className="text-muted-foreground">
                Execute and manage forecast comparison analyses
              </p>
            </div>
                         <Button disabled={!actualsDataset || forecastDatasets.length === 0}>
               <Play className="h-4 w-4 mr-2" />
               Start New Run
             </Button>
           </div>
 
           {comparisonRuns.length > 0 ? (
             <div className="grid gap-4">
               {comparisonRuns.map((run: any) => (
                <Card key={run.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium">{run.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {run.selectedForecastIds?.length || 0} forecast models selected
                        </p>
                      </div>
                      <Badge className={getStatusColor(run.status)}>
                        {run.status}
                      </Badge>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Started:</span>
                        <span className="ml-2">
                          {run.startTime ? format(new Date(run.startTime), 'MMM dd, yyyy HH:mm') : 'Not started'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="ml-2">
                          {run.endTime ? format(new Date(run.endTime), 'MMM dd, yyyy HH:mm') : 'Not completed'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <span className="ml-2">
                          {format(new Date(run.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Results
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Comparison Runs</h3>
                <p className="text-muted-foreground mb-4">
                  Start a comparison run to analyze forecast accuracy
                </p>
                <Button disabled={!actualsDataset || forecastDatasets.length === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  Start First Run
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 