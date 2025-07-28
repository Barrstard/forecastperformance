# Background Jobs Setup Guide

## Overview

The application now uses a background job system powered by **Bull** and **Redis** to handle large dataset processing (5M+ rows) without timing out API requests.

## Architecture

- **Bull**: Job queue library for Node.js
- **Redis**: In-memory data store for job queue persistence
- **Background Processing**: Large datasets are processed in chunks to avoid memory issues

## Setup Instructions

### 1. Install Redis

#### Windows (WSL2 recommended)
```bash
# Install Redis on WSL2 Ubuntu
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### macOS
```bash
# Using Homebrew
brew install redis
brew services start redis
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 2. Environment Configuration

Add these environment variables to your `.env.local` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3. Verify Redis Connection

Test that Redis is running:

```bash
redis-cli ping
# Should return: PONG
```

## How It Works

### Dataset Size Thresholds

- **< 10,000 records**: Processed immediately (synchronous)
- **≥ 10,000 records**: Queued for background processing

### Background Processing Features

1. **Chunked Processing**: Data is processed in 50K record chunks
2. **Progress Tracking**: Real-time progress updates
3. **Error Handling**: Automatic retries with exponential backoff
4. **Status Monitoring**: Job status and progress tracking
5. **Memory Management**: Prevents memory overflow with large datasets

### Job States

- `waiting`: Job is queued
- `active`: Job is currently processing
- `completed`: Job finished successfully
- `failed`: Job failed (with retry attempts)

## Usage

### For Users

1. **Large Datasets**: When you try to sync a large dataset, the system will automatically queue it for background processing
2. **Progress Monitoring**: A progress component will appear showing real-time updates
3. **Completion**: You'll be notified when the job completes

### For Developers

#### Starting Background Jobs

```typescript
import { bigQuerySyncQueue } from '@/lib/queue'

// Add a job to the queue
const job = await bigQuerySyncQueue.add('forecast-sync', {
  datasetId,
  environment,
  volumeType,
  startDate,
  endDate,
  totalCount,
  jobType: 'forecast'
})
```

#### Monitoring Job Status

```typescript
// Get job status
const job = await bigQuerySyncQueue.getJob(jobId)
const state = await job.getState()
const progress = await job.progress()
```

## Troubleshooting

### Redis Connection Issues

1. **Check if Redis is running**:
   ```bash
   redis-cli ping
   ```

2. **Check Redis logs**:
   ```bash
   sudo journalctl -u redis-server
   ```

3. **Verify port configuration**:
   ```bash
   netstat -tlnp | grep 6379
   ```

### Job Processing Issues

1. **Check job queue status**:
   ```typescript
   const waiting = await bigQuerySyncQueue.getWaiting()
   const active = await bigQuerySyncQueue.getActive()
   const completed = await bigQuerySyncQueue.getCompleted()
   const failed = await bigQuerySyncQueue.getFailed()
   ```

2. **Clear failed jobs**:
   ```typescript
   await bigQuerySyncQueue.clean(0, 'failed')
   ```

### Memory Issues

If you encounter memory issues with very large datasets:

1. **Reduce chunk size** in `lib/queue.ts`:
   ```typescript
   const chunkSize = 25000 // Reduce from 50000
   ```

2. **Increase delay between chunks**:
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 200)) // Increase from 100ms
   ```

## Performance Considerations

### Recommended Dataset Sizes

- **Optimal**: 1-3 months of data (100K-500K records)
- **Acceptable**: 6 months of data (500K-1M records)
- **Large**: 1 year of data (1M-5M records)
- **Very Large**: >5M records (may require optimization)

### Scaling Recommendations

1. **Use smaller date ranges** for initial testing
2. **Monitor memory usage** during processing
3. **Consider data archiving** for historical data
4. **Implement data partitioning** for very large datasets

## Security Considerations

1. **Redis Security**: Configure Redis with authentication if needed
2. **Network Security**: Ensure Redis is not exposed to external networks
3. **Data Privacy**: Background jobs process sensitive data - ensure proper access controls

## Monitoring and Logging

### Job Monitoring

The system provides real-time monitoring through:
- Job progress tracking
- Status updates
- Error reporting
- Performance metrics

### Logging

All background job activities are logged with:
- Job creation and completion
- Progress updates
- Error details
- Performance metrics

## Support

If you encounter issues with the background job system:

1. Check Redis connection and configuration
2. Review job logs for error details
3. Verify dataset size and chunk processing
4. Contact support with job IDs and error messages 