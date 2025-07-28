import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

export interface WriteConfig {
  batchSize: number
  maxConcurrent: number
  retryAttempts: number
  deadlockRetryDelay: number
}

export interface WriteStats {
  totalRecords: number
  insertedRecords: number
  skippedRecords: number
  errorRecords: number
  duration: number
}

export class OptimizedDBWriter {
  private config: WriteConfig
  private stats: WriteStats = {
    totalRecords: 0,
    insertedRecords: 0,
    skippedRecords: 0,
    errorRecords: 0,
    duration: 0
  }

  constructor(config: Partial<WriteConfig> = {}) {
    this.config = {
      batchSize: config.batchSize || 2000, // Smaller batches to reduce memory usage
      maxConcurrent: config.maxConcurrent || 2, // Reduce concurrent operations
      retryAttempts: config.retryAttempts || 3,
      deadlockRetryDelay: config.deadlockRetryDelay || 1000
    }
  }

  /**
   * Optimized bulk insert for forecast data
   */
  async insertForecastData(
    datasetId: string,
    records: any[],
    volumeType: string,
    onProgress?: (stats: WriteStats) => void
  ): Promise<WriteStats> {
    const startTime = Date.now()
    this.resetStats()
    this.stats.totalRecords = records.length

    if (records.length === 0) {
      return this.stats
    }

    console.log(`Starting optimized insert of ${records.length.toLocaleString()} forecast records`)

    // Process records in batches with controlled concurrency
    const batches = this.createBatches(records, this.config.batchSize)
    const semaphore = this.createSemaphore(this.config.maxConcurrent)

    const batchPromises = batches.map(async (batch, batchIndex) => {
      await semaphore.acquire()
      
      try {
        await this.insertForecastBatch(datasetId, batch, volumeType, batchIndex + 1)
        this.stats.insertedRecords += batch.length
      } catch (error) {
        console.error(`Batch ${batchIndex + 1} failed:`, error)
        this.stats.errorRecords += batch.length
      } finally {
        semaphore.release()
        
        // Clear batch reference to help garbage collection
        batch.length = 0
        
        // Report progress
        if (onProgress) {
          onProgress({ ...this.stats })
        }
        
        // Force garbage collection every 20 batches
        if (batchIndex % 20 === 0 && global.gc) {
          global.gc()
        }
      }
    })

    // Wait for all batches to complete
    await Promise.all(batchPromises)

    this.stats.duration = Date.now() - startTime
    console.log(`Completed forecast insert: ${this.stats.insertedRecords.toLocaleString()} inserted, ${this.stats.errorRecords} errors in ${this.stats.duration}ms`)

    return this.stats
  }

  /**
   * Optimized bulk insert for actuals data
   */
  async insertActualsData(
    datasetId: string,
    records: any[],
    onProgress?: (stats: WriteStats) => void
  ): Promise<WriteStats> {
    const startTime = Date.now()
    this.resetStats()
    this.stats.totalRecords = records.length

    if (records.length === 0) {
      return this.stats
    }

    console.log(`Starting optimized insert of ${records.length.toLocaleString()} actuals records`)

    // Process records in batches with controlled concurrency
    const batches = this.createBatches(records, this.config.batchSize)
    const semaphore = this.createSemaphore(this.config.maxConcurrent)

    const batchPromises = batches.map(async (batch, batchIndex) => {
      await semaphore.acquire()
      
      try {
        await this.insertActualsBatch(datasetId, batch, batchIndex + 1)
        this.stats.insertedRecords += batch.length
      } catch (error) {
        console.error(`Batch ${batchIndex + 1} failed:`, error)
        this.stats.errorRecords += batch.length
      } finally {
        semaphore.release()
        
        // Clear batch reference to help garbage collection
        batch.length = 0
        
        // Report progress
        if (onProgress) {
          onProgress({ ...this.stats })
        }
        
        // Force garbage collection every 20 batches
        if (batchIndex % 20 === 0 && global.gc) {
          global.gc()
        }
      }
    })

    // Wait for all batches to complete
    await Promise.all(batchPromises)

    this.stats.duration = Date.now() - startTime
    console.log(`Completed actuals insert: ${this.stats.insertedRecords.toLocaleString()} inserted, ${this.stats.errorRecords} errors in ${this.stats.duration}ms`)

    return this.stats
  }

  /**
   * Insert a batch of forecast data with retry logic
   */
  private async insertForecastBatch(
    datasetId: string,
    records: any[],
    volumeType: string,
    batchNumber: number
  ): Promise<void> {
    const forecastData = records.map((row: any, index: number) => {
      try {
        return {
          forecastDatasetId: datasetId,
          orgId: this.parseIntSafe(row.orgId),
          partitionDate: this.parseDateSafe(row.partitionDate),
          dailyAmount: this.parseFloatSafe(row.dailyAmount),
          volumeDriver: this.truncateString(row.volumeDriver, 65535),
          volumeType: volumeType,
          // Business structure fields
          brand: this.truncateString(row.brand, 65535),
          region: this.truncateString(row.region, 65535),
          area: this.truncateString(row.area, 65535),
          site: this.truncateString(row.site, 65535),
          department: this.truncateString(row.department, 65535),
          category: this.truncateString(row.category, 65535),
          contextName: this.truncateString(row.contextName, 65535),
          orgPathTxt: this.truncateString(row.orgPathTxt, 65535)
        }
      } catch (error) {
        console.warn(`Error processing record ${index} in batch ${batchNumber}:`, error)
        return null
      }
    }).filter(Boolean) as any[]

    if (forecastData.length === 0) {
      console.warn(`Batch ${batchNumber}: No valid records to insert`)
      return
    }

    await this.executeWithRetry(async () => {
      await prisma.vVolumeForecast.createMany({
        data: forecastData,
        skipDuplicates: true
      })
    }, `forecast batch ${batchNumber}`)
  }

  /**
   * Insert a batch of actuals data with retry logic
   */
  private async insertActualsBatch(
    datasetId: string,
    records: any[],
    batchNumber: number
  ): Promise<void> {
    const actualsData = records.map((row: any, index: number) => {
      try {
        return {
          actualsDatasetId: datasetId,
          orgId: this.parseIntSafe(row.orgId),
          partitionDate: this.parseDateSafe(row.partitionDate),
          dailyAmount: this.parseFloatSafe(row.dailyAmount),
          volumeDriver: this.truncateString(row.volumeDriver, 65535),
          // Business structure fields from join
          brand: this.truncateString(row.brand, 65535),
          region: this.truncateString(row.region, 65535),
          area: this.truncateString(row.area, 65535),
          site: this.truncateString(row.site, 65535),  
          department: this.truncateString(row.department, 65535),
          category: this.truncateString(row.category, 65535),
          contextName: this.truncateString(row.contextName, 65535),
          orgPathTxt: this.truncateString(row.orgPathTxt, 65535)
        }
      } catch (error) {
        console.warn(`Error processing record ${index} in batch ${batchNumber}:`, error)
        return null
      }
    }).filter(Boolean) as any[]

    if (actualsData.length === 0) {
      console.warn(`Batch ${batchNumber}: No valid records to insert`)
      return
    }

    await this.executeWithRetry(async () => {
      await prisma.vActualVolume.createMany({
        data: actualsData,
        skipDuplicates: true
      })
    }, `actuals batch ${batchNumber}`)
  }

  /**
   * Execute operation with retry logic for deadlocks and connection issues
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Check for retryable errors
        const isRetryable = this.isRetryableError(error as Error)
        
        if (attempt < this.config.retryAttempts && isRetryable) {
          const delay = this.config.deadlockRetryDelay * attempt
          console.warn(`${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`, error)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          break
        }
      }
    }

    throw lastError
  }

  /**
   * Check if error is retryable (deadlocks, connection issues, etc.)
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return (
      message.includes('deadlock') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('lock wait timeout') ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    )
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Simple semaphore for controlling concurrency
   */
  private createSemaphore(maxConcurrent: number) {
    let running = 0
    const queue: Array<() => void> = []

    return {
      async acquire() {
        return new Promise<void>((resolve) => {
          if (running < maxConcurrent) {
            running++
            resolve()
          } else {
            queue.push(resolve)
          }
        })
      },
      
      release() {
        running--
        if (queue.length > 0) {
          const next = queue.shift()!
          running++
          next()
        }
      }
    }
  }

  /**
   * Safe integer parsing
   */
  private parseIntSafe(value: any): number {
    if (value === null || value === undefined) return 0
    const parsed = parseInt(value)
    return isNaN(parsed) ? 0 : parsed
  }

  /**
   * Safe float parsing  
   */
  private parseFloatSafe(value: any): number {
    if (value === null || value === undefined) return 0
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  /**
   * Safe date parsing - converts to date-only (no time)
   */
  private parseDateSafe(value: any): Date {
    if (!value) return new Date()
    
    try {
      let dateStr: string
      
      if (value instanceof Date) {
        dateStr = value.toISOString().split('T')[0] // Extract date part only
      } else if (typeof value === 'string') {
        dateStr = value.split('T')[0] // Extract date part only
      } else if (value && typeof value.value === 'string') {
        dateStr = value.value.split('T')[0] // Extract date part only
      } else {
        return new Date()
      }
      
      // Convert to date-only with UTC timezone
      return new Date(dateStr + 'T00:00:00.000Z')
    } catch {
      return new Date()
    }
  }

  /**
   * Truncate string to prevent database errors
   */
  private truncateString(value: any, maxLength: number): string {
    if (!value) return ''
    const str = String(value)
    return str.length > maxLength ? str.substring(0, maxLength) : str
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      totalRecords: 0,
      insertedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      duration: 0
    }
  }

  /**
   * Get current statistics
   */
  getStats(): WriteStats {
    return { ...this.stats }
  }
}