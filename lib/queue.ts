import Queue from 'bull'
import { prisma } from './prisma'
import { BigQuery } from '@google-cloud/bigquery'
import { StreamingBigQueryService } from './streaming-bigquery'
import { OptimizedDBWriter } from './optimized-db-writer'

// Redis configuration - Updated to use remote Redis instance
const redisConfig = {
  host: process.env.REDIS_HOST || '192.168.1.11',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0')
}

// Create queues
export const bigQuerySyncQueue = new Queue('bigquery-sync', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
})

// Process BigQuery sync jobs
bigQuerySyncQueue.process('forecast', async (job) => {
  const { 
    datasetId, 
    environment, 
    volumeType, 
    startDate, 
    endDate, 
    totalCount,
    jobType 
  } = job.data

  console.log(`Processing ${jobType} sync job for dataset ${datasetId}`)

  try {
    // Update job status
    await prisma.forecastDataset.update({
      where: { id: datasetId },
      data: {
        loadStatus: 'PROCESSING',
        metadata: {
          jobId: job.id,
          jobType,
          volumeType,
          startDate,
          endDate,
          totalCount,
          startedAt: new Date().toISOString(),
          progress: 0
        }
      }
    })

    // Process the data
    await processForecastData(datasetId, environment, volumeType, startDate, endDate, totalCount, job)

    // Mark as completed
    await prisma.forecastDataset.update({
      where: { id: datasetId },
      data: {
        loadStatus: 'COMPLETED',
        loadedAt: new Date(),
        metadata: {
          jobId: job.id,
          jobType,
          volumeType,
          startDate,
          endDate,
          totalCount,
          completedAt: new Date().toISOString(),
          progress: 100
        }
      }
    })

    console.log(`Successfully completed ${jobType} sync job for dataset ${datasetId}`)

  } catch (error) {
    console.error(`Error processing ${jobType} sync job for dataset ${datasetId}:`, error)
    
    // Update status to failed
    await prisma.forecastDataset.update({
      where: { id: datasetId },
      data: {
        loadStatus: 'FAILED',
        metadata: {
          jobId: job.id,
          jobType,
          volumeType,
          startDate,
          endDate,
          totalCount,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        }
      }
    })

    throw error
  }
})

// Process actuals sync jobs
bigQuerySyncQueue.process('actuals', async (job) => {
  const { 
    datasetId, 
    environment, 
    startDate, 
    endDate, 
    totalCount,
    jobType 
  } = job.data

  console.log(`Processing ${jobType} sync job for dataset ${datasetId}`)

  try {
    // Update job status
    await prisma.actualsDataset.update({
      where: { id: datasetId },
      data: {
        loadStatus: 'PROCESSING',
        metadata: {
          jobId: job.id,
          jobType,
          startDate,
          endDate,
          totalCount,
          startedAt: new Date().toISOString(),
          progress: 0
        }
      }
    })

    // Process the data
    await processActualsData(datasetId, environment, startDate, endDate, totalCount, job)

    // Mark as completed
    await prisma.actualsDataset.update({
      where: { id: datasetId },
      data: {
        loadStatus: 'COMPLETED',
        loadedAt: new Date(),
        metadata: {
          jobId: job.id,
          jobType,
          startDate,
          endDate,
          totalCount,
          completedAt: new Date().toISOString(),
          progress: 100
        }
      }
    })

    console.log(`Successfully completed ${jobType} sync job for dataset ${datasetId}`)

  } catch (error) {
    console.error(`Error processing ${jobType} sync job for dataset ${datasetId}:`, error)
    
    // Update status to failed
    await prisma.actualsDataset.update({
      where: { id: datasetId },
      data: {
        loadStatus: 'FAILED',
        metadata: {
          jobId: job.id,
          jobType,
          startDate,
          endDate,
          totalCount,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        }
      }
    })

    throw error
  }
})

// Process forecast data using streaming approach
async function processForecastData(
  datasetId: string, 
  environment: any, 
  volumeType: string, 
  startDate: string, 
  endDate: string, 
  totalCount: number,
  job: any
) {
  // Delete existing data first
  console.log(`Deleting existing forecast data for dataset: ${datasetId}`)
  await prisma.vVolumeForecast.deleteMany({
    where: { forecastDatasetId: datasetId }
  })

  // Initialize streaming service with memory-conscious config
  const streamingService = new StreamingBigQueryService(
    environment.bigqueryCredentials,
    environment.bigqueryProjectId,
    {
      chunkSize: 10000,  // Smaller chunks for memory efficiency
      maxMemoryMB: 512,  // Memory limit
      timeoutMs: 60000,  // 60 second timeout
      retryAttempts: 3
    }
  )

  // Initialize optimized database writer
  const dbWriter = new OptimizedDBWriter({
    batchSize: 5000,     // Database batch size
    maxConcurrent: 2,    // Limit concurrent writes
    retryAttempts: 3
  })

  const query = `
    SELECT 
      forecast.orgId as orgId, 
      forecast.partitionDate as partitionDate, 
      forecast.dailyAmount as dailyAmount, 
      forecast.volumeDriver as volumeDriver,
      forecast.volumeType as volumeType,
      bs.orgBreak2 as brand,  
      bs.orgBreak3 as region,
      bs.orgBreak4 as area,
      bs.orgBreak6 as site,
      bs.orgBreak7 as department,
      bs.orgBreak0 as category,
      bs.contextName as contextName,
      bs.orgPathTxt as orgPathTxt
    FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vVolumeForecast\` as forecast
    JOIN \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vBusinessStructure\` as bs 
      ON forecast.orgId = bs.orgId
    WHERE forecast.volumeType = @volumeType
      AND forecast.partitionDate BETWEEN @startDate AND @endDate
  `

  // Ensure dates are properly formatted as strings for BigQuery
  const formattedStartDate = typeof startDate === 'string' ? startDate : 
    startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate
  const formattedEndDate = typeof endDate === 'string' ? endDate : 
    endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate

  const params = { 
    volumeType, 
    startDate: formattedStartDate, 
    endDate: formattedEndDate 
  }
  let processedCount = 0
  const startTime = Date.now()

  // Stream and process data in chunks
  await streamingService.streamQuery(
    query,
    params,
    async (chunk, streamingJob) => {
      // Write chunk to database
      const writeStats = await dbWriter.insertForecastData(
        datasetId,
        chunk,
        volumeType
      )

      processedCount += writeStats.insertedRecords

      // Calculate progress and timing metrics
      const progressPercent = Math.round((processedCount / (totalCount || streamingJob.totalEstimate)) * 100)
      const elapsedTimeMs = Date.now() - startTime
      const elapsedTimeSeconds = Math.round(elapsedTimeMs / 1000)
      const recordsPerSecond = processedCount > 0 ? Math.round(processedCount / (elapsedTimeMs / 1000)) : 0
      
      // Calculate estimates
      const totalRecords = totalCount || streamingJob.totalEstimate
      const remainingRecords = totalRecords - processedCount
      const estimatedRemainingTimeMs = recordsPerSecond > 0 ? (remainingRecords / recordsPerSecond) * 1000 : 0
      const estimatedFinishTime = estimatedRemainingTimeMs > 0 ? new Date(Date.now() + estimatedRemainingTimeMs) : null
      
      // Update Bull job progress
      try {
        await job.progress(progressPercent)
      } catch (jobProgressError) {
        console.warn('Failed to update job progress:', jobProgressError)
      }

      // Update job metadata with detailed metrics
      try {
        await prisma.forecastDataset.update({
          where: { id: datasetId },
          data: {
            metadata: {
              jobId: job.id,
              jobType: 'forecast',
              volumeType,
              startDate,
              endDate,
              totalCount: totalRecords,
              processedCount,
              progress: progressPercent,
              memoryUsageMB: streamingJob.memoryUsageMB,
              // Timing metrics
              startTime: startTime,
              elapsedTimeSeconds,
              recordsPerSecond,
              estimatedRemainingTimeMs,
              estimatedFinishTime: estimatedFinishTime?.toISOString(),
              lastUpdate: new Date().toISOString()
            }
          }
        })
      } catch (updateError) {
        console.warn('Failed to update progress:', updateError)
      }

      console.log(`Processed ${processedCount.toLocaleString()}/${totalRecords.toLocaleString()} records (${progressPercent}%) | ${recordsPerSecond}/sec | Est. ${Math.round(estimatedRemainingTimeMs / 1000 / 60)}min remaining | Memory: ${streamingJob.memoryUsageMB}MB`)
      
      // Force garbage collection every 50,000 records to prevent memory leaks
      if (processedCount % 50000 === 0) {
        if (global.gc) {
          global.gc()
          console.log(`🗑️  Forced garbage collection at ${processedCount.toLocaleString()} records`)
        }
      }
    },
    `forecast_${datasetId}`,
    'partitionDate'
  )

  console.log(`Completed forecast processing: ${processedCount.toLocaleString()} records`)
}

// Process actuals data using streaming approach
async function processActualsData(
  datasetId: string, 
  environment: any, 
  startDate: string, 
  endDate: string, 
  totalCount: number,
  job: any
) {
  // Delete existing data first
  console.log(`Deleting existing actuals data for dataset: ${datasetId}`)
  await prisma.vActualVolume.deleteMany({
    where: { actualsDatasetId: datasetId }
  })

  // Initialize streaming service with memory-conscious config
  const streamingService = new StreamingBigQueryService(
    environment.bigqueryCredentials,
    environment.bigqueryProjectId,
    {
      chunkSize: 10000,  // Smaller chunks for memory efficiency
      maxMemoryMB: 512,  // Memory limit
      timeoutMs: 60000,  // 60 second timeout
      retryAttempts: 3
    }
  )

  // Initialize optimized database writer
  const dbWriter = new OptimizedDBWriter({
    batchSize: 5000,     // Database batch size
    maxConcurrent: 2,    // Limit concurrent writes
    retryAttempts: 3
  })

  const query = `
    SELECT 
      actuals.orgId as orgId, 
      actuals.partitionDate as partitionDate, 
      actuals.dailyAmount as dailyAmount, 
      actuals.volumeDriver as volumeDriver,
      bs.orgBreak2 as brand, 
      bs.orgBreak3 as region,
      bs.orgBreak4 as area,
      bs.orgBreak6 as site,
      bs.orgBreak7 as department,
      bs.orgBreak0 as category,
      bs.contextName as contextName,
      bs.orgPathTxt as orgPathTxt
    FROM \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vActualVolume\` as actuals
    JOIN \`${environment.bigqueryProjectId}.${environment.bigqueryDataset}.vBusinessStructure\` as bs 
      ON actuals.orgId = bs.orgId
    WHERE actuals.partitionDate BETWEEN @startDate AND @endDate
  `

  // Ensure dates are properly formatted as strings for BigQuery
  const formattedStartDate = typeof startDate === 'string' ? startDate : 
    startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate
  const formattedEndDate = typeof endDate === 'string' ? endDate : 
    endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate

  const params = { 
    startDate: formattedStartDate, 
    endDate: formattedEndDate 
  }
  let processedCount = 0
  const startTime = Date.now()

  // Stream and process data in chunks
  await streamingService.streamQuery(
    query,
    params,
    async (chunk, streamingJob) => {
      // Write chunk to database
      const writeStats = await dbWriter.insertActualsData(
        datasetId,
        chunk
      )

      processedCount += writeStats.insertedRecords

      // Calculate progress and timing metrics
      const progressPercent = Math.round((processedCount / (totalCount || streamingJob.totalEstimate)) * 100)
      const elapsedTimeMs = Date.now() - startTime
      const elapsedTimeSeconds = Math.round(elapsedTimeMs / 1000)
      const recordsPerSecond = processedCount > 0 ? Math.round(processedCount / (elapsedTimeMs / 1000)) : 0
      
      // Calculate estimates
      const totalRecords = totalCount || streamingJob.totalEstimate
      const remainingRecords = totalRecords - processedCount
      const estimatedRemainingTimeMs = recordsPerSecond > 0 ? (remainingRecords / recordsPerSecond) * 1000 : 0
      const estimatedFinishTime = estimatedRemainingTimeMs > 0 ? new Date(Date.now() + estimatedRemainingTimeMs) : null
      
      // Update Bull job progress
      try {
        await job.progress(progressPercent)
      } catch (jobProgressError) {
        console.warn('Failed to update job progress:', jobProgressError)
      }

      // Update job metadata with detailed metrics
      try {
        await prisma.actualsDataset.update({
          where: { id: datasetId },
          data: {
            metadata: {
              jobId: job.id,
              jobType: 'actuals',
              startDate,
              endDate,
              totalCount: totalRecords,
              processedCount,
              progress: progressPercent,
              memoryUsageMB: streamingJob.memoryUsageMB,
              // Timing metrics
              startTime: startTime,
              elapsedTimeSeconds,
              recordsPerSecond,
              estimatedRemainingTimeMs,
              estimatedFinishTime: estimatedFinishTime?.toISOString(),
              lastUpdate: new Date().toISOString()
            }
          }
        })
      } catch (updateError) {
        console.warn('Failed to update progress:', updateError)
      }

      console.log(`Processed ${processedCount.toLocaleString()}/${totalRecords.toLocaleString()} records (${progressPercent}%) | ${recordsPerSecond}/sec | Est. ${Math.round(estimatedRemainingTimeMs / 1000 / 60)}min remaining | Memory: ${streamingJob.memoryUsageMB}MB`)
      
      // Force garbage collection every 50,000 records to prevent memory leaks
      if (processedCount % 50000 === 0) {
        if (global.gc) {
          global.gc()
          console.log(`🗑️  Forced garbage collection at ${processedCount.toLocaleString()} records`)
        }
      }
    },
    `actuals_${datasetId}`,
    'partitionDate'
  )

  console.log(`Completed actuals processing: ${processedCount.toLocaleString()} records`)
}


// Queue event handlers
bigQuerySyncQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`)
})

bigQuerySyncQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err)
})

bigQuerySyncQueue.on('error', (err) => {
  console.error('Queue error:', err)
})

export default bigQuerySyncQueue 