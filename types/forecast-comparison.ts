import { ComparisonModelStatus, DataSourceType, DataLoadStatus, ForecastModelType, RunStatus } from '@prisma/client'

// Core comparison model types
export interface ForecastComparisonModel {
  id: string
  name: string
  description?: string | null
  environmentId: string
  period_start: Date
  period_end: Date
  status: ComparisonModelStatus
  metadata?: any | null
  createdAt: Date
  updatedAt: Date
  environment?: Environment
  actualsDataset?: ActualsDataset | null
  forecastDatasets?: ForecastDataset[]
  comparisonRuns?: ComparisonRun[]
}

export interface ActualsDataset {
  id: string
  comparisonModelId: string
  name: string
  dataSource: DataSourceType
  bigqueryTable?: string | null
  uploadedFile?: string | null
  recordCount?: number | null
  dateRange?: any | null
  loadStatus: DataLoadStatus
  loadedAt?: Date | null
  metadata?: any | null
  createdAt: Date
  comparisonModel?: ForecastComparisonModel
  actualVolumes?: VActualVolume[]
}

export interface ForecastDataset {
  id: string
  comparisonModelId: string
  name: string
  modelType: ForecastModelType
  dataSource: DataSourceType
  bigqueryTable?: string | null
  ukgDimensionsJobId?: string | null
  uploadedFile?: string | null
  recordCount?: number | null
  dateRange?: any | null
  loadStatus: DataLoadStatus
  loadedAt?: Date | null
  metadata?: any | null
  createdAt: Date
  comparisonModel?: ForecastComparisonModel
  volumeForecasts?: VVolumeForecast[]
  comparisonResults?: ComparisonResult[]
}

export interface ComparisonRun {
  id: string
  comparisonModelId: string
  name: string
  selectedForecastIds: string[]
  filters?: any | null
  status: RunStatus
  startTime?: Date | null
  endTime?: Date | null
  accuracyMetrics?: any | null
  statisticalAnalysis?: any | null
  errorMessage?: string | null
  createdAt: Date
  comparisonModel?: ForecastComparisonModel
  results?: ComparisonResult[]
}

export interface ComparisonResult {
  id: string
  comparisonRunId: string
  forecastDatasetId: string
  orgId: number
  partitionDate: Date
  actualValue: number
  forecastValue: number
  absoluteError: number
  percentageError: number
  accuracyScore: number
  createdAt: Date
  comparisonRun?: ComparisonRun
  forecastDataset?: ForecastDataset
}

// API request/response types
export interface CreateComparisonModelRequest {
  name: string
  description?: string
  environmentId: string
  period_start: string
  period_end: string
}

export interface UpdateComparisonModelRequest {
  name?: string
  description?: string
  period_start?: string
  period_end?: string
  status?: ComparisonModelStatus
}

export interface CreateActualsDatasetRequest {
  name: string
  dataSource: DataSourceType
  bigqueryTable?: string
  uploadedFile?: string
}

export interface CreateForecastDatasetRequest {
  name: string
  modelType: ForecastModelType
  dataSource: DataSourceType
  bigqueryTable?: string
  ukgDimensionsJobId?: string
  uploadedFile?: string
}

export interface CreateComparisonRunRequest {
  name: string
  selectedForecastIds: string[]
  filters?: any
}

// Analysis and metrics types
export interface AccuracyMetrics {
  mape: number
  mae: number
  rmse: number
  mape_rank: number
  mae_rank: number
  rmse_rank: number
  overall_score: number
  overall_rank: number
}

export interface StatisticalAnalysis {
  confidence_intervals: {
    lower: number
    upper: number
    confidence_level: number
  }
  significance_test: {
    p_value: number
    is_significant: boolean
    test_type: string
  }
  distribution_stats: {
    mean: number
    median: number
    std_dev: number
    skewness: number
    kurtosis: number
  }
}

export interface ComparisonFilters {
  dateRange?: {
    start: string
    end: string
  }
  orgIds?: number[]
  volumeTypes?: string[]
  volumeDrivers?: string[]
  excludeOutliers?: boolean
  outlierThreshold?: number
}

// Dashboard and UI types
export interface ComparisonModelSummary {
  id: string
  name: string
  status: ComparisonModelStatus
  period_start: Date
  period_end: Date
  actualsStatus: DataLoadStatus
  forecastCount: number
  runCount: number
  lastRunDate?: Date
  environmentName: string
}

export interface DatasetStatus {
  id: string
  name: string
  loadStatus: DataLoadStatus
  recordCount?: number
  loadedAt?: Date
  errorMessage?: string
  progress?: number
}

export interface RunSummary {
  id: string
  name: string
  status: RunStatus
  startTime?: Date
  endTime?: Date
  selectedForecastCount: number
  resultCount?: number
  accuracyMetrics?: AccuracyMetrics
}

// Data loading types
export interface DataLoadingJob {
  id: string
  type: 'actuals' | 'forecast'
  datasetId: string
  status: DataLoadStatus
  progress: number
  totalRecords?: number
  processedRecords?: number
  errorMessage?: string
  startedAt: Date
  completedAt?: Date
}

export interface BigQuerySyncConfig {
  projectId: string
  dataset: string
  table: string
  dateRange?: {
    start: string
    end: string
  }
  filters?: Record<string, any>
}

export interface FileUploadConfig {
  fileName: string
  fileSize: number
  fileType: string
  expectedColumns: string[]
  dateColumn: string
  valueColumn: string
  orgIdColumn?: string
}

// Chart and visualization types
export interface ComparisonChartData {
  date: string
  actual: number
  forecasts: Record<string, number>
  errors: Record<string, number>
}

export interface AccuracyDistributionData {
  forecastId: string
  forecastName: string
  errorRanges: {
    range: string
    count: number
    percentage: number
  }[]
  overallAccuracy: number
}

export interface ModelRankingData {
  forecastId: string
  forecastName: string
  metrics: AccuracyMetrics
  rank: number
  isBest: boolean
}

// Environment and existing types (for compatibility)
export interface Environment {
  id: string
  name: string
  bigqueryProjectId: string
  bigqueryDataset: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface VVolumeForecast {
  id: string
  runId?: string | null
  forecastDatasetId?: string | null
  orgId: number
  partitionDate: Date
  volumeType: string
  volumeTypeId: number
  currency: string
  currencyId: number
  eventRatio: number
  dailyAmount: number
  volumeDriver: string
  volumeDriverId: number
  updateDtm: Date
  linkedCategoryType: string
  includeSummarySwt: boolean
  syncedAt: Date
}

export interface VActualVolume {
  id: string
  runId?: string | null
  actualsDatasetId?: string | null
  orgId: number
  partitionDate: Date
  dailyAmount: number
  volumeDriverId: number
  posLabel: string
  posLabelId: number
  updateDtm: Date
  linkedCategoryType: string
  includeSummarySwt: boolean
  syncedAt: Date
} 