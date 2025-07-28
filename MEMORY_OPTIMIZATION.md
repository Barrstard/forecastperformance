# Memory Optimization Guide

## Critical: Enable Garbage Collection

To allow manual garbage collection, you must start Node.js with the `--expose-gc` flag:

```bash
# Development
node --expose-gc node_modules/next/dist/bin/next dev

# Production
node --expose-gc node_modules/next/dist/bin/next start
```

## Alternatively, modify your package.json scripts:

```json
{
  "scripts": {
    "dev": "node --expose-gc node_modules/next/dist/bin/next dev",
    "start": "node --expose-gc node_modules/next/dist/bin/next start"
  }
}
```

## Why This Is Important

The data processing jobs handle millions of records and without manual garbage collection:
- Memory usage grows continuously from ~200MB to 700MB+
- Processing slows down significantly
- Jobs may crash or freeze
- Terminal becomes unresponsive

## What The Optimizations Do

1. **Manual Garbage Collection**: Forces memory cleanup every 50,000 records and every 20 database batches
2. **Smaller Chunks**: Reduced from 10K to 5K records per BigQuery chunk
3. **Lower Memory Limits**: Reduced threshold from 512MB to 400MB
4. **Array Cleanup**: Explicitly clears processed arrays to help GC
5. **Memory Monitoring**: Continuous monitoring with automatic GC triggers
6. **Batch Size Reduction**: Smaller database batches (2K instead of 5K)

## Expected Results

- Stable memory usage around 300-400MB
- Consistent processing speed throughout job
- No terminal slowdown or freezing
- Reliable completion of large datasets (20M+ records)

## Monitoring

Watch the console for GC messages:
- `🗑️  Forced garbage collection at 50,000 records`
- `🗑️  Forced garbage collection due to high memory usage: 350MB`
- `⏸️  Paused job due to memory pressure: 450MB`

If you still see continuous memory growth, the `--expose-gc` flag is not enabled.