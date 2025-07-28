import { create } from 'zustand'

export interface ForecastRun {
  id: string
  environmentId: string
  modelId: string
  dimensionsJobId?: string
  bigqueryProjectId: string
  startTime: string
  endTime?: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  dataPoints?: number
  metadata?: any
  createdAt: string
}

export interface ForecastModel {
  id: string
  name: string
  ukgModelId?: string
  description?: string
  isActive: boolean
  createdAt: string
}

export interface AccuracyDistribution {
  label: string
  count: number
  percentage: number
}

export interface SummaryMetrics {
  meanAccuracy: number
  medianAccuracy: number
  standardDeviation: number
  totalDataPoints: number
  withinTenPercent: number
  withinTwentyPercent: number
}

interface ForecastState {
  runs: ForecastRun[]
  models: ForecastModel[]
  selectedRunId: string | null
  accuracyData: Record<string, AccuracyDistribution[]>
  summaryData: Record<string, SummaryMetrics>
  isLoading: boolean
  error: string | null
  
  // Actions
  setRuns: (runs: ForecastRun[]) => void
  addRun: (run: ForecastRun) => void
  updateRun: (id: string, updates: Partial<ForecastRun>) => void
  setModels: (models: ForecastModel[]) => void
  addModel: (model: ForecastModel) => void
  updateModel: (id: string, updates: Partial<ForecastModel>) => void
  setSelectedRun: (id: string | null) => void
  setAccuracyData: (runId: string, data: AccuracyDistribution[]) => void
  setSummaryData: (runId: string, data: SummaryMetrics) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Computed
  currentRun: ForecastRun | null
  activeRuns: ForecastRun[]
  completedRuns: ForecastRun[]
  pendingRuns: ForecastRun[]
  runningRuns: ForecastRun[]
  failedRuns: ForecastRun[]
}

export const useForecastStore = create<ForecastState>((set, get) => ({
  runs: [],
  models: [],
  selectedRunId: null,
  accuracyData: {},
  summaryData: {},
  isLoading: false,
  error: null,
  
  setRuns: (runs) => set({ runs }),
  
  addRun: (run) => set((state) => ({
    runs: [...state.runs, run]
  })),
  
  updateRun: (id, updates) => set((state) => ({
    runs: state.runs.map(run => 
      run.id === id ? { ...run, ...updates } : run
    )
  })),
  
  setModels: (models) => set({ models }),
  
  addModel: (model) => set((state) => ({
    models: [...state.models, model]
  })),
  
  updateModel: (id, updates) => set((state) => ({
    models: state.models.map(model => 
      model.id === id ? { ...model, ...updates } : model
    )
  })),
  
  setSelectedRun: (id) => set({ selectedRunId: id }),
  
  setAccuracyData: (runId, data) => set((state) => ({
    accuracyData: { ...state.accuracyData, [runId]: data }
  })),
  
  setSummaryData: (runId, data) => set((state) => ({
    summaryData: { ...state.summaryData, [runId]: data }
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  get currentRun() {
    const { runs, selectedRunId } = get()
    return runs.find(run => run.id === selectedRunId) || null
  },
  
  get activeRuns() {
    const { runs } = get()
    return runs.filter(run => run.status === 'RUNNING' || run.status === 'PENDING')
  },
  
  get completedRuns() {
    const { runs } = get()
    return runs.filter(run => run.status === 'COMPLETED')
  },
  
  get pendingRuns() {
    const { runs } = get()
    return runs.filter(run => run.status === 'PENDING')
  },
  
  get runningRuns() {
    const { runs } = get()
    return runs.filter(run => run.status === 'RUNNING')
  },
  
  get failedRuns() {
    const { runs } = get()
    return runs.filter(run => run.status === 'FAILED')
  }
})) 