import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Environment {
  id: string
  name: string
  bigqueryProjectId: string
  bigqueryDataset: string
  bigqueryCredentials?: any
  ukgProUrl?: string
  ukgProClientId?: string
  ukgProClientSecret?: string
  ukgProAppKey?: string
  ukgProUsername?: string
  ukgProPassword?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface EnvironmentState {
  environments: Environment[]
  currentEnvironmentId: string | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setEnvironments: (environments: Environment[]) => void
  addEnvironment: (environment: Environment) => void
  updateEnvironment: (id: string, updates: Partial<Environment>) => void
  deleteEnvironment: (id: string) => void
  setCurrentEnvironment: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Computed
  currentEnvironment: Environment | null
  activeEnvironments: Environment[]
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      environments: [],
      currentEnvironmentId: null,
      isLoading: false,
      error: null,
      
      setEnvironments: (environments) => set({ environments }),
      
      addEnvironment: (environment) => set((state) => ({
        environments: [...state.environments, environment]
      })),
      
      updateEnvironment: (id, updates) => set((state) => ({
        environments: state.environments.map(env => 
          env.id === id ? { ...env, ...updates, updatedAt: new Date().toISOString() } : env
        )
      })),
      
      deleteEnvironment: (id) => set((state) => ({
        environments: state.environments.filter(env => env.id !== id),
        currentEnvironmentId: state.currentEnvironmentId === id ? null : state.currentEnvironmentId
      })),
      
      setCurrentEnvironment: (id) => set({ currentEnvironmentId: id }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      get currentEnvironment() {
        const { environments, currentEnvironmentId } = get()
        return environments.find(env => env.id === currentEnvironmentId) || null
      },
      
      get activeEnvironments() {
        const { environments } = get()
        return environments.filter(env => env.isActive)
      }
    }),
    {
      name: 'environment-store',
      partialize: (state) => ({
        environments: state.environments,
        currentEnvironmentId: state.currentEnvironmentId
      })
    }
  )
) 