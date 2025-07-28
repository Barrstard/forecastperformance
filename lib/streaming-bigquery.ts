import { BigQuery } from '@google-cloud/bigquery'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'

export interface StreamingConfig {
  chunkSize: number
  maxMemoryMB: number
  timeoutMs: number
  retryAttempts: number
}

export interface StreamingJob {
  id: string
  totalEstimate: number
  processedCount: number
  status: 'running' | 'paused' | 'completed' | 'failed'
  lastProcessedKey?: string
  memoryUsageMB: number
}

export class StreamingBigQueryService {
  private client: BigQuery
  private config: StreamingConfig
  private activeJobs: Map<string, StreamingJob> = new Map()
  private memoryCheckInterval: NodeJS.Timeout | null = null

  constructor(credentials: any, projectId: string, config: Partial<StreamingConfig> = {}) {
    this.client = new BigQuery({
      credentials,
      projectId
    })
    
    this.config = {
      chunkSize: config.chunkSize || 5000, // Smaller chunks to reduce memory usage
      maxMemoryMB: config.maxMemoryMB || 400, // Lower memory threshold
      timeoutMs: config.timeoutMs || 30000,
      retryAttempts: config.retryAttempts || 3
    }
    
    // Start memory monitoring
    this.startMemoryMonitoring()
  }

  /**
   * Stream large datasets using cursor-based pagination instead of OFFSET/LIMIT
   */
  async streamQuery(
    query: string,
    params: any,
    onChunk: (chunk: any[], progress: StreamingJob) => Promise<void>,
    jobId: string,
    orderByField: string = 'partitionDate'
  ): Promise<void> {
    // Initialize job tracking
    const job: StreamingJob = {
      id: jobId,
      totalEstimate: await this.estimateRowCount(query, params),
      processedCount: 0,
      status: 'running',
      memoryUsageMB: 0
    }
    
    this.activeJobs.set(jobId, job)

    try {
      let lastProcessedValue: any = null
      let hasMoreData = true
      
      while (hasMoreData && job.status === 'running') {
        // Check memory usage before processing
        const memoryUsage = this.getMemoryUsageMB()
        job.memoryUsageMB = memoryUsage
        
        if (memoryUsage > this.config.maxMemoryMB) {
          job.status = 'paused'
          console.warn(`Job ${jobId} paused due to memory usage: ${memoryUsage}MB`)
          
          // Wait for memory to clear
          await this.waitForMemoryRelease(jobId)
          job.status = 'running'
        }

        // Build cursor-based query
        const cursorQuery = this.buildCursorQuery(query, orderByField, lastProcessedValue)
        
        console.log(`Streaming chunk for job ${jobId}, processed: ${job.processedCount.toLocaleString()}`)
        
        // Execute query with timeout
        const [queryJob] = await this.client.createQueryJob({
          query: cursorQuery,
          params,
          jobTimeoutMs: this.config.timeoutMs
        })

        const [rows] = await this.executeWithRetry(() => queryJob.getQueryResults({
          maxResults: this.config.chunkSize
        }))

        if (rows.length === 0) {
          hasMoreData = false
          break
        }

        // Check if we got fewer rows than requested (indicates end) - BEFORE clearing array
        const isLastChunk = rows.length < this.config.chunkSize
        
        // Process chunk
        await onChunk(rows, { ...job })
        
        // Update progress
        job.processedCount += rows.length
        
        // Extract last processed value and ensure it's in the right format
        const lastRow = rows[rows.length - 1]
        if (lastRow && lastRow[orderByField]) {
          lastProcessedValue = lastRow[orderByField]
          
          // If it's a BigQuery date/datetime object, extract the value
          if (lastProcessedValue && typeof lastProcessedValue === 'object' && lastProcessedValue.value) {
            lastProcessedValue = lastProcessedValue.value
          }
        }
        
        // Clear rows array to help garbage collection
        rows.length = 0
        
        // Set hasMoreData based on chunk size check done earlier
        if (isLastChunk) {
          hasMoreData = false
        }

        // Update job status
        this.activeJobs.set(jobId, { ...job })
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      job.status = 'completed'
      console.log(`Job ${jobId} completed. Total processed: ${job.processedCount.toLocaleString()}`)
      
    } catch (error) {
      job.status = 'failed'
      console.error(`Job ${jobId} failed:`, error)
      throw error
    } finally {
      this.activeJobs.set(jobId, job)
    }
  }

  /**
   * Build cursor-based query for efficient pagination
   */
  private buildCursorQuery(baseQuery: string, orderByField: string, lastValue: any): string {
    let finalQuery = baseQuery
    
    // Add cursor condition if we have a last processed value
    if (lastValue) {
      // Format the last value properly for BigQuery
      let formattedValue: string
      if (lastValue instanceof Date) {
        formattedValue = lastValue.toISOString().split('T')[0] // YYYY-MM-DD format
      } else if (typeof lastValue === 'string') {
        formattedValue = lastValue.split('T')[0] // Extract date part
      } else if (lastValue && typeof lastValue.value === 'string') {
        formattedValue = lastValue.value.split('T')[0] // Extract date part from BigQuery format
      } else {
        formattedValue = new Date().toISOString().split('T')[0]
      }
      
      if (baseQuery.includes('WHERE')) {
        // Add to existing WHERE clause
        finalQuery = baseQuery.replace('WHERE', `WHERE ${orderByField} > DATE('${formattedValue}') AND`)
      } else {
        // Add new WHERE clause
        finalQuery = `${baseQuery} WHERE ${orderByField} > DATE('${formattedValue}')`
      }
    }
    
    // Ensure proper ordering for cursor-based pagination
    if (!finalQuery.includes('ORDER BY')) {
      finalQuery = `${finalQuery} ORDER BY ${orderByField} ASC`
    }
    
    return `${finalQuery} LIMIT ${this.config.chunkSize}`
  }

  /**
   * Estimate total row count for progress tracking
   */
  private async estimateRowCount(query: string, params: any): Promise<number> {
    try {
      // Convert query to count query
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`
      const [rows] = await this.client.query({ query: countQuery, params })
      return parseInt(rows[0]?.total || '0')
    } catch (error) {
      console.warn('Could not estimate row count:', error)
      return 0
    }
  }

  /**
   * Execute query with retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        console.warn(`Attempt ${attempt} failed:`, error)
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError
  }

  /**
   * Monitor memory usage
   */
  private getMemoryUsageMB(): number {
    const usage = process.memoryUsage()
    return Math.round(usage.heapUsed / 1024 / 1024)
  }

  /**
   * Wait for memory to be released
   */
  private async waitForMemoryRelease(jobId: string): Promise<void> {
    let attempts = 0
    const maxAttempts = 30 // 30 seconds max wait
    
    while (attempts < maxAttempts) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const memoryUsage = this.getMemoryUsageMB()
      if (memoryUsage < this.config.maxMemoryMB * 0.8) {
        console.log(`Memory released for job ${jobId}: ${memoryUsage}MB`)
        return
      }
      
      attempts++
    }
    
    console.warn(`Memory did not release for job ${jobId} after ${maxAttempts} seconds`)
  }

  /**
   * Get job status
   */
  getJob(jobId: string): StreamingJob | undefined {
    return this.activeJobs.get(jobId)
  }

  /**
   * Pause a running job
   */
  pauseJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (job && job.status === 'running') {
      job.status = 'paused'
      this.activeJobs.set(jobId, job)
      return true
    }
    return false
  }

  /**
   * Resume a paused job
   */
  resumeJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (job && job.status === 'paused') {
      job.status = 'running'
      this.activeJobs.set(jobId, job)
      return true
    }
    return false
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (job) {
      job.status = 'failed'
      this.activeJobs.set(jobId, job)
      return true
    }
    return false
  }

  /**
   * Clean up completed/failed jobs
   */
  cleanupJobs(): void {
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.activeJobs.delete(jobId)
      }
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      const memoryUsage = this.getMemoryUsageMB()
      
      // Force garbage collection if memory is getting high
      if (memoryUsage > this.config.maxMemoryMB * 0.8 && global.gc) {
        global.gc()
        console.log(`🗑️  Forced garbage collection due to high memory usage: ${memoryUsage}MB`)
      }
      
      // Pause all running jobs if memory is critically high
      if (memoryUsage > this.config.maxMemoryMB) {
        for (const [jobId, job] of this.activeJobs.entries()) {
          if (job.status === 'running') {
            job.status = 'paused'
            console.warn(`⏸️  Paused job ${jobId} due to memory pressure: ${memoryUsage}MB`)
          }
        }
      }
    }, 5000) // Check every 5 seconds
  }

  /**
   * Stop memory monitoring
   */
  private stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
    }
  }

  /**
   * Destructor to clean up resources
   */
  destroy(): void {
    this.stopMemoryMonitoring()
    this.activeJobs.clear()
  }
}