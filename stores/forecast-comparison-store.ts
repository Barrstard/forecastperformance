import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  ForecastComparisonModel,
  ActualsDataset,
  ForecastDataset,
  ComparisonRun,
  ComparisonResult,
  ComparisonModelSummary,
  DatasetStatus,
  RunSummary,
  DataLoadingJob,
  CreateComparisonModelRequest,
  CreateActualsDatasetRequest,
  CreateForecastDatasetRequest,
  CreateComparisonRunRequest,
  ComparisonFilters
} from '@/types/forecast-comparison'
import { forecastComparisonApi } from '@/lib/forecast-comparison-api'

interface ForecastComparisonState {
  // Core state
  comparisonModels: ForecastComparisonModel[]
  currentModelId: string | null
  selectedForecasts: string[]
  comparisonResults: ComparisonResult[]
  loading: boolean
  error: string | null
  
  // Data loading state
  loadingJobs: Map<string, DataLoadingJob>
  progress: Map<string, number>
  errors: Map<string, string>
  
  // UI state
  filters: ComparisonFilters | null
  viewMode: 'list' | 'detail' | 'analysis'
  
  // Actions
  setComparisonModels: (models: ForecastComparisonModel[]) => void
  addComparisonModel: (model: ForecastComparisonModel) => void
  updateComparisonModel: (id: string, updates: Partial<ForecastComparisonModel>) => void
  deleteComparisonModel: (id: string) => void
  setCurrentModel: (id: string | null) => void
  toggleForecastSelection: (forecastId: string) => void
  setComparisonResults: (results: ComparisonResult[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Data loading actions
  startLoadingJob: (job: DataLoadingJob) => void
  updateProgress: (jobId: string, progress: number) => void
  completeJob: (jobId: string, result?: any) => void
  failJob: (jobId: string, error: string) => void
  
  // UI actions
  setFilters: (filters: ComparisonFilters | null) => void
  setViewMode: (mode: 'list' | 'detail' | 'analysis') => void
  
  // Computed getters
  getCurrentModel: () => ForecastComparisonModel | null
  getModelSummaries: () => ComparisonModelSummary[]
  getSelectedForecastDatasets: () => ForecastDataset[]
  getLoadingJob: (jobId: string) => DataLoadingJob | undefined
  getActiveJobs: () => DataLoadingJob[]
  
  // Computed properties for component access
  currentModel: ForecastComparisonModel | null
  actualsDataset: ActualsDataset | null
  forecastDatasets: ForecastDataset[]
  comparisonRuns: ComparisonRun[]
  
  // Data fetching actions
  fetchModelDetails: (id: string) => Promise<void>
  fetchActualsDataset: (modelId: string) => Promise<void>
  fetchForecastDatasets: (modelId: string) => Promise<void>
  fetchComparisonRuns: (modelId: string) => Promise<void>
}

export const useForecastComparisonStore = create<ForecastComparisonState>()(
  devtools(
    (set, get) => ({
      // Initial state
      comparisonModels: [],
      currentModelId: null,
      selectedForecasts: [],
      comparisonResults: [],
      loading: false,
      error: null,
      loadingJobs: new Map(),
      progress: new Map(),
      errors: new Map(),
      filters: null,
      viewMode: 'list',
      
      // Core actions
      setComparisonModels: (models) => set({ comparisonModels: models }),
      
      addComparisonModel: (model) => set((state) => ({
        comparisonModels: [...state.comparisonModels, model]
      })),
      
      updateComparisonModel: (id, updates) => set((state) => ({
        comparisonModels: state.comparisonModels.map(model =>
          model.id === id ? { ...model, ...updates } : model
        )
      })),
      
      deleteComparisonModel: (id) => set((state) => ({
        comparisonModels: state.comparisonModels.filter(model => model.id !== id),
        currentModelId: state.currentModelId === id ? null : state.currentModelId
      })),
      
      setCurrentModel: (id) => set({ currentModelId: id }),
      
      toggleForecastSelection: (forecastId) => set((state) => ({
        selectedForecasts: state.selectedForecasts.includes(forecastId)
          ? state.selectedForecasts.filter(id => id !== forecastId)
          : [...state.selectedForecasts, forecastId]
      })),
      
      setComparisonResults: (results) => set({ comparisonResults: results }),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      // Data loading actions
      startLoadingJob: (job) => set((state) => {
        const newJobs = new Map(state.loadingJobs)
        newJobs.set(job.id, job)
        return { loadingJobs: newJobs }
      }),
      
      updateProgress: (jobId, progress) => set((state) => {
        const newProgress = new Map(state.progress)
        newProgress.set(jobId, progress)
        return { progress: newProgress }
      }),
      
      completeJob: (jobId, result) => set((state) => {
        const newJobs = new Map(state.loadingJobs)
        const job = newJobs.get(jobId)
        if (job) {
          newJobs.set(jobId, { ...job, status: 'COMPLETED', completedAt: new Date() })
        }
        return { loadingJobs: newJobs }
      }),
      
      failJob: (jobId, error) => set((state) => {
        const newJobs = new Map(state.loadingJobs)
        const newErrors = new Map(state.errors)
        const job = newJobs.get(jobId)
        if (job) {
          newJobs.set(jobId, { ...job, status: 'FAILED', errorMessage: error })
        }
        newErrors.set(jobId, error)
        return { loadingJobs: newJobs, errors: newErrors }
      }),
      
      // UI actions
      setFilters: (filters) => set({ filters }),
      
      setViewMode: (mode) => set({ viewMode: mode }),
      
      // Computed getters
      getCurrentModel: () => {
        const state = get()
        return state.currentModelId
          ? state.comparisonModels.find(model => model.id === state.currentModelId) || null
          : null
      },
      
      getModelSummaries: () => {
        const state = get()
        return state.comparisonModels.map(model => ({
          id: model.id,
          name: model.name,
          status: model.status,
          period_start: model.period_start,
          period_end: model.period_end,
          actualsStatus: model.actualsDataset?.loadStatus || 'PENDING',
          forecastCount: model.forecastDatasets?.length || 0,
          runCount: model.comparisonRuns?.length || 0,
          lastRunDate: model.comparisonRuns?.[0]?.createdAt,
          environmentName: model.environment?.name || 'Unknown'
        }))
      },
      
      getSelectedForecastDatasets: () => {
        const state = get()
        const currentModel = state.getCurrentModel()
        if (!currentModel?.forecastDatasets) return []
        
        return currentModel.forecastDatasets.filter(dataset =>
          state.selectedForecasts.includes(dataset.id)
        )
      },
      
      getLoadingJob: (jobId) => {
        const state = get()
        return state.loadingJobs.get(jobId)
      },
      
      getActiveJobs: () => {
        const state = get()
        return Array.from(state.loadingJobs.values()).filter(
          job => job.status === 'PENDING' || job.status === 'LOADING'
        )
      },
      
      // Computed properties for component access
      get currentModel() {
        const state = get()
        console.log('Getting currentModel:', {
          currentModelId: state.currentModelId,
          comparisonModelsCount: state.comparisonModels.length,
          modelIds: state.comparisonModels.map(m => m.id)
        })
        const result = state.currentModelId
          ? state.comparisonModels.find(model => model.id === state.currentModelId) || null
          : null
        console.log('currentModel result:', result)
        return result
      },
      
      get actualsDataset() {
        const state = get()
        const currentModel = state.currentModelId
          ? state.comparisonModels.find(model => model.id === state.currentModelId) || null
          : null
        return currentModel?.actualsDataset || null
      },
      
      get forecastDatasets() {
        const state = get()
        const currentModel = state.currentModelId
          ? state.comparisonModels.find(model => model.id === state.currentModelId) || null
          : null
        return currentModel?.forecastDatasets || []
      },
      
      get comparisonRuns() {
        const state = get()
        const currentModel = state.currentModelId
          ? state.comparisonModels.find(model => model.id === state.currentModelId) || null
          : null
        return currentModel?.comparisonRuns || []
      },
      
      // Data fetching actions
      fetchModelDetails: async (id: string) => {
        console.log('fetchModelDetails called with id:', id)
        set({ loading: true, error: null })
        try {
          console.log('Calling API...')
          const model = await forecastComparisonApi.getComparisonModel(id)
          console.log('API returned model:', model)
          
          set((state) => {
            console.log('Setting state with model:', {
              currentModelsCount: state.comparisonModels.length,
              modelId: id,
              modelName: model.name
            })
            
            // Check if model already exists in the array
            const existingModelIndex = state.comparisonModels.findIndex(m => m.id === id)
            let updatedModels = [...state.comparisonModels]
            
            if (existingModelIndex >= 0) {
              // Update existing model
              console.log('Updating existing model at index:', existingModelIndex)
              updatedModels[existingModelIndex] = model
            } else {
              // Add new model to array
              console.log('Adding new model to array')
              updatedModels.push(model)
            }
            
            const newState = {
              comparisonModels: updatedModels,
              currentModelId: id,
              loading: false
            }
            
            console.log('New state:', {
              comparisonModelsCount: newState.comparisonModels.length,
              currentModelId: newState.currentModelId,
              loading: newState.loading
            })
            
            return newState
          })
        } catch (error: any) {
          console.error('Error in fetchModelDetails:', error)
          set({ 
            error: error.message || 'Failed to fetch model details',
            loading: false 
          })
        }
      },
      
      fetchActualsDataset: async (modelId: string) => {
        try {
          const model = await forecastComparisonApi.getComparisonModel(modelId)
          set((state) => ({
            comparisonModels: state.comparisonModels.map(m => 
              m.id === modelId ? model : m
            )
          }))
        } catch (error: any) {
          console.error('Failed to fetch actuals dataset:', error)
        }
      },
      
      fetchForecastDatasets: async (modelId: string) => {
        try {
          const datasets = await forecastComparisonApi.getForecastDatasets(modelId)
          set((state) => ({
            comparisonModels: state.comparisonModels.map(m => 
              m.id === modelId ? { ...m, forecastDatasets: datasets } : m
            )
          }))
        } catch (error: any) {
          console.error('Failed to fetch forecast datasets:', error)
        }
      },
      
      fetchComparisonRuns: async (modelId: string) => {
        try {
          const runs = await forecastComparisonApi.getComparisonRuns(modelId)
          set((state) => ({
            comparisonModels: state.comparisonModels.map(m => 
              m.id === modelId ? { ...m, comparisonRuns: runs } : m
            )
          }))
        } catch (error: any) {
          console.error('Failed to fetch comparison runs:', error)
        }
      }
    }),
    {
      name: 'forecast-comparison-store'
    }
  )
)

// Re-export the API for convenience
export { forecastComparisonApi } from '@/lib/forecast-comparison-api' 