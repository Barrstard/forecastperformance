import {
  ForecastComparisonModel,
  ActualsDataset,
  ForecastDataset,
  ComparisonRun,
  ComparisonResult,
  DataLoadingJob,
  CreateComparisonModelRequest,
  CreateActualsDatasetRequest,
  CreateForecastDatasetRequest,
  CreateComparisonRunRequest
} from '@/types/forecast-comparison'

// API functions for forecast comparison operations
export const forecastComparisonApi = {
  // Comparison Models
  async getComparisonModels(): Promise<ForecastComparisonModel[]> {
    const response = await fetch('/api/forecast-comparison-models')
    if (!response.ok) throw new Error('Failed to fetch comparison models')
    return response.json()
  },
  
  async createComparisonModel(data: CreateComparisonModelRequest): Promise<ForecastComparisonModel> {
    const response = await fetch('/api/forecast-comparison-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create comparison model')
    return response.json()
  },
  
  async getComparisonModel(id: string): Promise<ForecastComparisonModel> {
    const response = await fetch(`/api/forecast-comparison-models/${id}`)
    if (!response.ok) throw new Error('Failed to fetch comparison model')
    return response.json()
  },
  
  async updateComparisonModel(id: string, data: Partial<CreateComparisonModelRequest>): Promise<ForecastComparisonModel> {
    const response = await fetch(`/api/forecast-comparison-models/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update comparison model')
    return response.json()
  },
  
  async deleteComparisonModel(id: string): Promise<void> {
    const response = await fetch(`/api/forecast-comparison-models/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete comparison model')
  },
  
  // Actuals Datasets
  async createActualsDataset(modelId: string, data: CreateActualsDatasetRequest): Promise<ActualsDataset> {
    const response = await fetch(`/api/forecast-comparison-models/${modelId}/actuals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create actuals dataset')
    return response.json()
  },
  
  async updateActualsDataset(modelId: string, data: CreateActualsDatasetRequest): Promise<ActualsDataset> {
    const response = await fetch(`/api/forecast-comparison-models/${modelId}/actuals`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update actuals dataset')
    return response.json()
  },
  
  async deleteActualsDataset(modelId: string): Promise<void> {
    const response = await fetch(`/api/forecast-comparison-models/${modelId}/actuals`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete actuals dataset')
  },
  
  // Forecast Datasets
  async getForecastDatasets(modelId: string): Promise<ForecastDataset[]> {
    const response = await fetch(`/api/forecast-comparison-models/${modelId}/forecasts`)
    if (!response.ok) throw new Error('Failed to fetch forecast datasets')
    return response.json()
  },
  
  async createForecastDataset(modelId: string, data: CreateForecastDatasetRequest): Promise<ForecastDataset> {
    const response = await fetch(`/api/forecast-comparison-models/${modelId}/forecasts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create forecast dataset')
    return response.json()
  },
  
  async updateForecastDataset(id: string, data: Partial<CreateForecastDatasetRequest>): Promise<ForecastDataset> {
    const response = await fetch(`/api/forecast-datasets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update forecast dataset')
    return response.json()
  },
  
  async deleteForecastDataset(id: string): Promise<void> {
    const response = await fetch(`/api/forecast-datasets/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete forecast dataset')
  },
  
  // Comparison Runs
  async getComparisonRuns(modelId: string): Promise<ComparisonRun[]> {
    const response = await fetch(`/api/forecast-comparison-models/${modelId}/runs`)
    if (!response.ok) throw new Error('Failed to fetch comparison runs')
    return response.json()
  },
  
  async createComparisonRun(modelId: string, data: CreateComparisonRunRequest): Promise<ComparisonRun> {
    const response = await fetch(`/api/forecast-comparison-models/${modelId}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create comparison run')
    return response.json()
  },
  
  async getComparisonRun(id: string): Promise<ComparisonRun> {
    const response = await fetch(`/api/comparison-runs/${id}`)
    if (!response.ok) throw new Error('Failed to fetch comparison run')
    return response.json()
  },
  
  async getComparisonResults(runId: string, page = 1, limit = 100): Promise<{
    results: ComparisonResult[]
    total: number
    page: number
    totalPages: number
  }> {
    const response = await fetch(`/api/comparison-runs/${runId}/results?page=${page}&limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch comparison results')
    return response.json()
  },
  
  // Data Loading
  async syncBigQueryData(config: {
    datasetId: string
    datasetType: 'actuals' | 'forecast'
    bigqueryConfig: any
  }): Promise<{ jobId: string }> {
    const response = await fetch('/api/data-loading/bigquery-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    if (!response.ok) throw new Error('Failed to sync BigQuery data')
    return response.json()
  },
  
  async uploadFile(formData: FormData): Promise<{ jobId: string }> {
    const response = await fetch('/api/data-loading/file-upload', {
      method: 'POST',
      body: formData
    })
    if (!response.ok) throw new Error('Failed to upload file')
    return response.json()
  },
  
  async getLoadingStatus(jobId: string): Promise<DataLoadingJob> {
    const response = await fetch(`/api/data-loading/status/${jobId}`)
    if (!response.ok) throw new Error('Failed to get loading status')
    return response.json()
  }
} 