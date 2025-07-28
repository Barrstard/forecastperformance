import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { parse } from 'csv-parse/sync'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const datasetId = formData.get('datasetId') as string
    const datasetType = formData.get('datasetType') as string
    const config = JSON.parse(formData.get('config') as string)

    // Validate required fields
    if (!file || !datasetId || !datasetType || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: file, datasetId, datasetType, config' },
        { status: 400 }
      )
    }

    // Validate dataset type
    if (!['actuals', 'forecast'].includes(datasetType)) {
      return NextResponse.json(
        { error: 'Invalid datasetType. Must be "actuals" or "forecast"' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only CSV and Excel files are supported' },
        { status: 400 }
      )
    }

    // Get the dataset
    let dataset
    if (datasetType === 'actuals') {
      dataset = await prisma.actualsDataset.findUnique({
        where: { id: datasetId },
        include: {
          comparisonModel: {
            include: {
              environment: true
            }
          }
        }
      })
    } else {
      dataset = await prisma.forecastDataset.findUnique({
        where: { id: datasetId },
        include: {
          comparisonModel: {
            include: {
              environment: true
            }
          }
        }
      })
    }

    if (!dataset) {
      return NextResponse.json(
        { error: `${datasetType} dataset not found` },
        { status: 404 }
      )
    }

    // Update dataset status to loading
    if (datasetType === 'actuals') {
      await prisma.actualsDataset.update({
        where: { id: datasetId },
        data: { loadStatus: 'LOADING' }
      })
    } else {
      await prisma.forecastDataset.update({
        where: { id: datasetId },
        data: { loadStatus: 'LOADING' }
      })
    }

    // Generate a job ID for tracking
    const jobId = `upload_${datasetType}_${datasetId}_${Date.now()}`

    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'uploads')
      await mkdir(uploadsDir, { recursive: true })

      // Save file to disk
      const fileName = `${jobId}_${file.name}`
      const filePath = join(uploadsDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      // Parse CSV file
      const fileContent = buffer.toString('utf-8')
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })

      if (records.length === 0) {
        throw new Error('No data found in uploaded file')
      }

      // Validate required columns
      const requiredColumns = datasetType === 'actuals' 
        ? [config.dateColumn, config.valueColumn]
        : [config.dateColumn, config.valueColumn, config.orgIdColumn]

      const fileColumns = Object.keys(records[0])
      const missingColumns = requiredColumns.filter(col => !fileColumns.includes(col))
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
      }

      // Process and insert the data
      let recordCount = 0
      if (datasetType === 'actuals') {
        // Process actual volumes
        const actualVolumes = records.map((row: any) => ({
          actualsDatasetId: datasetId,
          orgId: parseInt(row[config.orgIdColumn || 'orgId']) || 0,
          partitionDate: new Date(row[config.dateColumn]),
          dailyAmount: parseFloat(row[config.valueColumn]) || 0,
          volumeDriverId: parseInt(row[config.volumeDriverIdColumn || 'volumeDriverId']) || 0,
          posLabel: row[config.posLabelColumn || 'posLabel'] || '',
          posLabelId: parseInt(row[config.posLabelIdColumn || 'posLabelId']) || 0,
          updateDtm: new Date(),
          linkedCategoryType: row[config.linkedCategoryTypeColumn || 'linkedCategoryType'] || '',
          includeSummarySwt: row[config.includeSummarySwtColumn || 'includeSummarySwt'] === 'true'
        }))

        // Batch insert in chunks
        const chunkSize = 1000
        for (let i = 0; i < actualVolumes.length; i += chunkSize) {
          const chunk = actualVolumes.slice(i, i + chunkSize)
          await prisma.vActualVolume.createMany({
            data: chunk,
            skipDuplicates: true
          })
        }
        recordCount = actualVolumes.length
      } else {
        // Process volume forecasts
        const volumeForecasts = records.map((row: any) => ({
          forecastDatasetId: datasetId,
          orgId: parseInt(row[config.orgIdColumn]) || 0,
          partitionDate: new Date(row[config.dateColumn]),
          volumeType: row[config.volumeTypeColumn || 'volumeType'] || '',
          volumeTypeId: parseInt(row[config.volumeTypeIdColumn || 'volumeTypeId']) || 0,
          currency: row[config.currencyColumn || 'currency'] || '',
          currencyId: parseInt(row[config.currencyIdColumn || 'currencyId']) || 0,
          eventRatio: parseFloat(row[config.eventRatioColumn || 'eventRatio']) || 0,
          dailyAmount: parseFloat(row[config.valueColumn]) || 0,
          volumeDriver: row[config.volumeDriverColumn || 'volumeDriver'] || '',
          volumeDriverId: parseInt(row[config.volumeDriverIdColumn || 'volumeDriverId']) || 0,
          updateDtm: new Date(),
          linkedCategoryType: row[config.linkedCategoryTypeColumn || 'linkedCategoryType'] || '',
          includeSummarySwt: row[config.includeSummarySwtColumn || 'includeSummarySwt'] === 'true'
        }))

        // Batch insert in chunks
        const chunkSize = 1000
        for (let i = 0; i < volumeForecasts.length; i += chunkSize) {
          const chunk = volumeForecasts.slice(i, i + chunkSize)
          await prisma.vVolumeForecast.createMany({
            data: chunk,
            skipDuplicates: true
          })
        }
        recordCount = volumeForecasts.length
      }

      // Update dataset with completion status
      const dateRange = {
        start: records[0][config.dateColumn],
        end: records[records.length - 1][config.dateColumn]
      }

      if (datasetType === 'actuals') {
        await prisma.actualsDataset.update({
          where: { id: datasetId },
          data: {
            loadStatus: 'COMPLETED',
            recordCount,
            dateRange,
            loadedAt: new Date(),
            uploadedFile: fileName
          }
        })
      } else {
        await prisma.forecastDataset.update({
          where: { id: datasetId },
          data: {
            loadStatus: 'COMPLETED',
            recordCount,
            dateRange,
            loadedAt: new Date(),
            uploadedFile: fileName
          }
        })
      }

      return NextResponse.json({
        jobId,
        status: 'COMPLETED',
        recordCount,
        fileName,
        message: `Successfully uploaded and processed ${recordCount} records from file`
      })

    } catch (error) {
      console.error('File upload processing error:', error)
      
      // Update dataset with error status
      if (datasetType === 'actuals') {
        await prisma.actualsDataset.update({
          where: { id: datasetId },
          data: { 
            loadStatus: 'FAILED',
            metadata: {
              ...dataset.metadata,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        })
      } else {
        await prisma.forecastDataset.update({
          where: { id: datasetId },
          data: { 
            loadStatus: 'FAILED',
            metadata: {
              ...dataset.metadata,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        })
      }

      return NextResponse.json(
        { 
          jobId,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in file upload:', error)
    return NextResponse.json(
      { error: 'Failed to process uploaded file' },
      { status: 500 }
    )
  }
} 