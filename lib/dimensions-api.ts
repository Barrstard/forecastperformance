import axios, { AxiosInstance } from 'axios'

export interface UKGProCredentials {
  url: string
  clientId: string
  clientSecret: string
  appKey: string
  username: string
  password: string
}

export interface UKGProToken {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  refresh_token?: string
}

export interface UKGProModel {
  id: string
  name: string
  description?: string
  version: string
  isActive: boolean
  parameters: ModelParameter[]
}

export interface ModelParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date'
  required: boolean
  defaultValue?: any
  description?: string
}

export interface UKGProJob {
  id: string
  modelId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  startTime: string
  endTime?: string
  error?: string
  metadata?: any
  jobType?: string
  priority?: number
  estimatedCompletion?: string
  createdBy?: string
  lastUpdated?: string
}

export interface UKGProBatchJob {
  id: string
  name: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
  progress: number
  startTime: string
  endTime?: string
  error?: string
  jobType: 'forecast' | 'data_sync' | 'report' | 'analysis' | 'custom'
  priority: number
  estimatedCompletion?: string
  createdBy: string
  lastUpdated: string
  metadata?: {
    modelId?: string
    parameters?: Record<string, any>
    targetTables?: string[]
    dataRange?: {
      start: string
      end: string
    }
    orgIds?: number[]
  }
  subJobs?: UKGProJob[]
  totalSubJobs?: number
  completedSubJobs?: number
}

export interface JobStatus {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  message?: string
  error?: string
  estimatedCompletion?: string
}

export class UKGProService {
  private client: AxiosInstance
  private baseUrl: string
  private credentials: UKGProCredentials
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(credentials: UKGProCredentials) {
    this.credentials = credentials
    this.baseUrl = credentials.url.replace(/\/$/, '') // Remove trailing slash
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 second timeout
    })

    // Add request/response interceptors for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('UKG Pro API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          url: error.config?.url,
          method: error.config?.method
        })
        throw new Error(`UKG Pro API Error: ${error.response?.data?.message || error.message}`)
      }
    )
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      // Try client credentials flow first
      const formData = new URLSearchParams()
      formData.append('grant_type', 'client_credentials')
      formData.append('client_id', this.credentials.clientId)
      formData.append('client_secret', this.credentials.clientSecret)
      formData.append('scope', 'openid profile email')

      const tokenResponse = await axios.post(`${this.baseUrl}/oauth2/v1/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'appkey': this.credentials.appKey,
          'Accept': 'application/json'
        }
      })

      const tokenData: UKGProToken = tokenResponse.data
      this.accessToken = tokenData.access_token
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000 // Expire 1 minute early

      // Update client headers with new token
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`
      this.client.defaults.headers.common['appkey'] = this.credentials.appKey

      return this.accessToken
    } catch (error: any) {
      console.error('Client credentials flow failed, trying password grant:', error.response?.data || error.message)
      
      // If client credentials fails, try password grant
      try {
        const formData = new URLSearchParams()
        formData.append('grant_type', 'password')
        formData.append('client_id', this.credentials.clientId)
        formData.append('client_secret', this.credentials.clientSecret)
        formData.append('username', this.credentials.username)
        formData.append('password', this.credentials.password)
        formData.append('scope', 'openid profile email')

        const tokenResponse = await axios.post(`${this.baseUrl}/oauth2/v1/token`, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'appkey': this.credentials.appKey,
            'Accept': 'application/json'
          }
        })

        const tokenData: UKGProToken = tokenResponse.data
        this.accessToken = tokenData.access_token
        this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000 // Expire 1 minute early

        // Update client headers with new token
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`
        this.client.defaults.headers.common['appkey'] = this.credentials.appKey

        return this.accessToken
      } catch (passwordError: any) {
        console.error('Password grant also failed:', passwordError.response?.data || passwordError.message)
        throw new Error(`Authentication failed: ${passwordError.response?.data?.error_description || passwordError.message}`)
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string; tenantInfo?: any }> {
    try {
      // Get access token first
      await this.getAccessToken()

      // Test connection by calling a simple API endpoint
      // Use a simpler endpoint that's more likely to work
      const response = await this.client.get('/wfc/api/v1/commons/data/multi_read', {
        data: {
          select: [
            {"key": "EMP_COMMON_FULL_NAME"}
          ],
          from: {
            view: "EMP",
            employeeSet: {
              hyperfind: {
                id: "1"
              },
              dateRange: {
                symbolicPeriod: {
                  id: 5
                }
              }
            }
          }
        }
      })
      
      return { 
        success: true,
        tenantInfo: {
          url: this.baseUrl,
          clientId: this.credentials.clientId
        }
      }
    } catch (error: any) {
      // If the complex endpoint fails, try a simpler health check
      try {
        const healthResponse = await this.client.get('/wfc/api/v1/health')
        return { 
          success: true,
          tenantInfo: {
            url: this.baseUrl,
            clientId: this.credentials.clientId
          }
        }
      } catch (healthError: any) {
        return { 
          success: false, 
          error: error.message 
        }
      }
    }
  }

  async getAvailableModels(): Promise<UKGProModel[]> {
    try {
      await this.getAccessToken()
      
      // This would need to be implemented based on UKG Pro's specific model endpoints
      // For now, return a placeholder
      const response = await this.client.get('/wfc/api/v1/commons/data/multi_read')
      return response.data
    } catch (error) {
      console.error('Failed to fetch available models:', error)
      throw error
    }
  }

  async getModelMetadata(modelId: string): Promise<UKGProModel> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.get(`/wfc/api/v1/models/${modelId}`)
      return response.data
    } catch (error) {
      console.error(`Failed to fetch model metadata for ${modelId}:`, error)
      throw error
    }
  }

  async triggerForecastRun(
    modelId: string, 
    parameters: Record<string, any>
  ): Promise<UKGProJob> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.post('/wfc/api/v1/jobs', {
        modelId,
        parameters,
        type: 'forecast'
      })
      return response.data
    } catch (error) {
      console.error('Failed to trigger forecast run:', error)
      throw error
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.get(`/wfc/api/v1/jobs/${jobId}/status`)
      return response.data
    } catch (error) {
      console.error(`Failed to get job status for ${jobId}:`, error)
      throw error
    }
  }

  async cancelJob(jobId: string): Promise<{ success: boolean }> {
    try {
      await this.getAccessToken()
      
      await this.client.post(`/wfc/api/v1/jobs/${jobId}/cancel`)
      return { success: true }
    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error)
      throw error
    }
  }

  async getJobHistory(
    modelId?: string,
    status?: string,
    limit: number = 50
  ): Promise<UKGProJob[]> {
    try {
      await this.getAccessToken()
      
      const params = new URLSearchParams()
      if (modelId) params.append('modelId', modelId)
      if (status) params.append('status', status)
      params.append('limit', limit.toString())

      const response = await this.client.get(`/wfc/api/v1/jobs/history?${params.toString()}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch job history:', error)
      throw error
    }
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'down'
    message: string
    lastCheck: string
  }> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.get('/wfc/api/v1/health')
      return response.data
    } catch (error) {
      console.error('Failed to get system health:', error)
      throw error
    }
  }

  // Retry mechanism for job status polling
  async pollJobStatus(
    jobId: string, 
    maxAttempts: number = 60, 
    intervalMs: number = 5000
  ): Promise<JobStatus> {
    let attempts = 0
    
    while (attempts < maxAttempts) {
      try {
        const status = await this.getJobStatus(jobId)
        
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
          return status
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, intervalMs))
        attempts++
      } catch (error) {
        console.error(`Error polling job status (attempt ${attempts + 1}):`, error)
        attempts++
        
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to poll job status after ${maxAttempts} attempts`)
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      }
    }
    
    throw new Error(`Job status polling timed out after ${maxAttempts} attempts`)
  }

  // Batch job operations
  async triggerMultipleForecasts(
    jobs: Array<{ modelId: string; parameters: Record<string, any> }>
  ): Promise<UKGProJob[]> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.post('/wfc/api/v1/jobs/batch', {
        jobs: jobs.map(job => ({
          ...job,
          type: 'forecast'
        }))
      })
      return response.data
    } catch (error) {
      console.error('Failed to trigger multiple forecast runs:', error)
      throw error
    }
  }

  // Get model performance metrics
  async getModelPerformance(modelId: string): Promise<{
    accuracy: number
    executionTime: number
    successRate: number
    lastRun: string
  }> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.get(`/wfc/api/v1/models/${modelId}/performance`)
      return response.data
    } catch (error) {
      console.error(`Failed to get model performance for ${modelId}:`, error)
      throw error
    }
  }

  // Get employee data for forecasting
  async getEmployeeData(dateRange: { start: string; end: string }): Promise<any[]> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.post('/wfc/api/v1/commons/data/multi_read', {
        select: [
          {"key": "EMP_COMMON_FULL_NAME"},
          {"key": "EMP_COMMON_EMP_ID"},
          {"key": "EMP_COMMON_ORG_UNIT"},
          {"key": "EMP_COMMON_POSITION"}
        ],
        from: {
          view: "EMP",
          employeeSet: {
            hyperfind: {
              id: "1" // All employees
            },
            dateRange: {
              symbolicPeriod: {
                id: 5 // Current period
              }
            }
          }
        }
      })
      
      return response.data
    } catch (error) {
      console.error('Failed to get employee data:', error)
      throw error
    }
  }

  // ===== BATCH JOB MANAGEMENT =====

  /**
   * Get all current batch jobs from UKG Pro
   */
  async getCurrentBatchJobs(filters?: {
    status?: string[]
    jobType?: string[]
    createdBy?: string
    limit?: number
    offset?: number
  }): Promise<{
    jobs: UKGProBatchJob[]
    total: number
    pagination: {
      limit: number
      offset: number
      hasMore: boolean
    }
  }> {
    try {
      await this.getAccessToken()
      
      const params = new URLSearchParams()
      if (filters?.status?.length) {
        filters.status.forEach(status => params.append('status', status))
      }
      if (filters?.jobType?.length) {
        filters.jobType.forEach(type => params.append('jobType', type))
      }
      if (filters?.createdBy) {
        params.append('createdBy', filters.createdBy)
      }
      if (filters?.limit) {
        params.append('limit', filters.limit.toString())
      }
      if (filters?.offset) {
        params.append('offset', filters.offset.toString())
      }

      const response = await this.client.get(`/wfc/api/v1/batch/jobs?${params.toString()}`)
      
      return {
        jobs: response.data.jobs || [],
        total: response.data.total || 0,
        pagination: {
          limit: filters?.limit || 50,
          offset: filters?.offset || 0,
          hasMore: (filters?.offset || 0) + (filters?.limit || 50) < (response.data.total || 0)
        }
      }
    } catch (error) {
      console.error('Failed to get current batch jobs:', error)
      throw error
    }
  }

  /**
   * Get a specific batch job by ID
   */
  async getBatchJob(jobId: string): Promise<UKGProBatchJob> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.get(`/wfc/api/v1/batch/jobs/${jobId}`)
      return response.data
    } catch (error) {
      console.error(`Failed to get batch job ${jobId}:`, error)
      throw error
    }
  }

  /**
   * Create a new batch job
   */
  async createBatchJob(jobData: {
    name: string
    description?: string
    jobType: 'forecast' | 'data_sync' | 'report' | 'analysis' | 'custom'
    priority?: number
    metadata?: {
      modelId?: string
      parameters?: Record<string, any>
      targetTables?: string[]
      dataRange?: {
        start: string
        end: string
      }
      orgIds?: number[]
    }
  }): Promise<UKGProBatchJob> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.post('/wfc/api/v1/batch/jobs', {
        ...jobData,
        priority: jobData.priority || 5,
        status: 'pending'
      })
      
      return response.data
    } catch (error) {
      console.error('Failed to create batch job:', error)
      throw error
    }
  }

  /**
   * Update batch job status
   */
  async updateBatchJobStatus(
    jobId: string, 
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused',
    metadata?: any
  ): Promise<UKGProBatchJob> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.patch(`/wfc/api/v1/batch/jobs/${jobId}/status`, {
        status,
        metadata
      })
      
      return response.data
    } catch (error) {
      console.error(`Failed to update batch job ${jobId} status:`, error)
      throw error
    }
  }

  /**
   * Cancel a batch job
   */
  async cancelBatchJob(jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.post(`/wfc/api/v1/batch/jobs/${jobId}/cancel`)
      return response.data
    } catch (error) {
      console.error(`Failed to cancel batch job ${jobId}:`, error)
      throw error
    }
  }

  /**
   * Pause a batch job
   */
  async pauseBatchJob(jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.post(`/wfc/api/v1/batch/jobs/${jobId}/pause`)
      return response.data
    } catch (error) {
      console.error(`Failed to pause batch job ${jobId}:`, error)
      throw error
    }
  }

  /**
   * Resume a paused batch job
   */
  async resumeBatchJob(jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.getAccessToken()
      
      const response = await this.client.post(`/wfc/api/v1/batch/jobs/${jobId}/resume`)
      return response.data
    } catch (error) {
      console.error(`Failed to resume batch job ${jobId}:`, error)
      throw error
    }
  }

  /**
   * Get batch job history with filtering
   */
  async getBatchJobHistory(filters?: {
    status?: string[]
    jobType?: string[]
    startDate?: string
    endDate?: string
    createdBy?: string
    limit?: number
    offset?: number
  }): Promise<{
    jobs: UKGProBatchJob[]
    total: number
    pagination: {
      limit: number
      offset: number
      hasMore: boolean
    }
  }> {
    try {
      await this.getAccessToken()
      
      const params = new URLSearchParams()
      if (filters?.status?.length) {
        filters.status.forEach(status => params.append('status', status))
      }
      if (filters?.jobType?.length) {
        filters.jobType.forEach(type => params.append('jobType', type))
      }
      if (filters?.startDate) {
        params.append('startDate', filters.startDate)
      }
      if (filters?.endDate) {
        params.append('endDate', filters.endDate)
      }
      if (filters?.createdBy) {
        params.append('createdBy', filters.createdBy)
      }
      if (filters?.limit) {
        params.append('limit', filters.limit.toString())
      }
      if (filters?.offset) {
        params.append('offset', filters.offset.toString())
      }

      const response = await this.client.get(`/wfc/api/v1/batch/jobs/history?${params.toString()}`)
      
      return {
        jobs: response.data.jobs || [],
        total: response.data.total || 0,
        pagination: {
          limit: filters?.limit || 50,
          offset: filters?.offset || 0,
          hasMore: (filters?.offset || 0) + (filters?.limit || 50) < (response.data.total || 0)
        }
      }
    } catch (error) {
      console.error('Failed to get batch job history:', error)
      throw error
    }
  }

  /**
   * Get batch job statistics
   */
  async getBatchJobStats(timeRange?: {
    start: string
    end: string
  }): Promise<{
    totalJobs: number
    completedJobs: number
    failedJobs: number
    runningJobs: number
    pendingJobs: number
    averageExecutionTime: number
    successRate: number
    jobTypeBreakdown: Record<string, number>
  }> {
    try {
      await this.getAccessToken()
      
      const params = new URLSearchParams()
      if (timeRange?.start) {
        params.append('startDate', timeRange.start)
      }
      if (timeRange?.end) {
        params.append('endDate', timeRange.end)
      }

      const response = await this.client.get(`/wfc/api/v1/batch/jobs/stats?${params.toString()}`)
      return response.data
    } catch (error) {
      console.error('Failed to get batch job statistics:', error)
      throw error
    }
  }

  /**
   * Monitor batch job progress in real-time
   */
  async monitorBatchJobProgress(
    jobId: string,
    onProgress?: (progress: number, status: string, message?: string) => void,
    intervalMs: number = 5000
  ): Promise<UKGProBatchJob> {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 720 // 1 hour max monitoring
      
      const checkProgress = async () => {
        try {
          const job = await this.getBatchJob(jobId)
          
          if (onProgress) {
            onProgress(job.progress, job.status, job.error)
          }
          
          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
            resolve(job)
            return
          }
          
          attempts++
          if (attempts >= maxAttempts) {
            reject(new Error(`Job monitoring timed out after ${maxAttempts} attempts`))
            return
          }
          
          setTimeout(checkProgress, intervalMs)
        } catch (error) {
          reject(error)
        }
      }
      
      checkProgress()
    })
  }
} 