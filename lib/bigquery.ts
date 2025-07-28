import { BigQuery } from '@google-cloud/bigquery'

export interface BigQueryCredentials {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
}

export interface BigQueryConnectionResult {
  success: boolean
  error?: string
  projectId?: string
  dataset?: string
  availableTables?: string[]
  suggestions?: string[]
}

export class BigQueryService {
  private client: BigQuery | null = null
  private projectId: string = ''
  private dataset: string = '' // Will be dynamically detected
  private readonly REQUIRED_TABLES = [
    'vVolumeForecast',
    'vActualVolume', 
    'vBusinessStructure',
    'vCalendarDate',
    'vFiscalCalendar'
  ]

  async connectWithCredentials(
    credentials: BigQueryCredentials,
    dataset?: string
  ): Promise<BigQueryConnectionResult> {
    try {
      // Validate credentials
      if (!credentials.project_id) {
        return {
          success: false,
          error: 'Invalid credentials: project_id is required'
        }
      }

      this.projectId = credentials.project_id

      // Initialize BigQuery client
      this.client = new BigQuery({
        credentials,
        projectId: this.projectId
      })

      // Test connection and detect dataset
      const testResult = await this.testConnection()
      
      if (testResult.success) {
        return {
          success: true,
          projectId: this.projectId,
          dataset: this.dataset,
          availableTables: testResult.availableTables
        }
      } else {
        return testResult
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to connect to BigQuery: ${error.message}`
      }
    }
  }

  async testConnection(): Promise<BigQueryConnectionResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'BigQuery client not initialized'
      }
    }

    try {
      // Get available datasets
      const datasets = await this.getAvailableDatasets()
      
      // Find the dataset containing 'detail'
      const detailDataset = this.findDetailDataset(datasets)
      
      if (!detailDataset) {
        return {
          success: false,
          error: 'No dataset containing "detail" found',
          projectId: this.projectId,
          suggestions: [
            'Ensure your BigQuery project has a dataset with "detail" in the name',
            'Check that your service account has access to list datasets',
            'Verify the dataset naming convention in your environment'
          ]
        }
      }

      this.dataset = detailDataset

      // Test access to required tables
      const availableTables = await this.getAvailableTables()
      const missingTables = this.REQUIRED_TABLES.filter(
        table => !availableTables.includes(table)
      )

      if (missingTables.length > 0) {
        return {
          success: false,
          error: `Missing required tables: ${missingTables.join(', ')}`,
          projectId: this.projectId,
          dataset: this.dataset,
          availableTables,
          suggestions: [
            'Ensure all required tables exist in the dataset',
            'Check table naming conventions',
            'Verify service account permissions for the dataset'
          ]
        }
      }

      return {
        success: true,
        projectId: this.projectId,
        dataset: this.dataset,
        availableTables
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Connection test failed: ${error.message}`,
        projectId: this.projectId
      }
    }
  }

  async getAvailableDatasets(): Promise<string[]> {
    if (!this.client) {
      throw new Error('BigQuery client not initialized')
    }

    try {
      const [datasets] = await this.client.getDatasets()
      return datasets.map(dataset => dataset.id || dataset.datasetId)
    } catch (error: any) {
      throw new Error(`Failed to get datasets: ${error.message}`)
    }
  }

  private findDetailDataset(datasets: string[]): string | null {
    return datasets.find(dataset => 
      dataset.toLowerCase().includes('detail')
    ) || null
  }

  async getAvailableTables(): Promise<string[]> {
    if (!this.client || !this.dataset) {
      throw new Error('BigQuery client or dataset not initialized')
    }

    try {
      const dataset = this.client.dataset(this.dataset)
      const [tables] = await dataset.getTables()
      return tables.map(table => table.id || table.tableId)
    } catch (error: any) {
      throw new Error(`Failed to get tables: ${error.message}`)
    }
  }

  async queryVolumeForecast(
    runId: string,
    dateRange?: { start: string; end: string },
    orgIds?: number[]
  ): Promise<any[]> {
    if (!this.client || !this.dataset) {
      throw new Error('BigQuery client not initialized')
    }

    let query = `
      SELECT *
      FROM \`${this.projectId}.${this.dataset}.vVolumeForecast\`
      WHERE 1=1
    `

    if (dateRange) {
      query += ` AND partitionDate >= '${dateRange.start}' AND partitionDate <= '${dateRange.end}'`
    }

    if (orgIds && orgIds.length > 0) {
      const orgIdsStr = orgIds.join(',')
      query += ` AND orgId IN (${orgIdsStr})`
    }

    query += ` ORDER BY partitionDate DESC`

    try {
      const [rows] = await this.client.query(query)
      return rows
    } catch (error: any) {
      throw new Error(`Failed to query volume forecast: ${error.message}`)
    }
  }

  async queryActualVolume(
    runId: string,
    dateRange?: { start: string; end: string },
    orgIds?: number[]
  ): Promise<any[]> {
    if (!this.client || !this.dataset) {
      throw new Error('BigQuery client not initialized')
    }

    let query = `
      SELECT *
      FROM \`${this.projectId}.${this.dataset}.vActualVolume\`
      WHERE 1=1
    `

    if (dateRange) {
      query += ` AND partitionDate >= '${dateRange.start}' AND partitionDate <= '${dateRange.end}'`
    }

    if (orgIds && orgIds.length > 0) {
      const orgIdsStr = orgIds.join(',')
      query += ` AND orgId IN (${orgIdsStr})`
    }

    query += ` ORDER BY partitionDate DESC`

    try {
      const [rows] = await this.client.query(query)
      return rows
    } catch (error: any) {
      throw new Error(`Failed to query actual volume: ${error.message}`)
    }
  }

  async queryBusinessStructure(orgIds?: number[]): Promise<any[]> {
    if (!this.client || !this.dataset) {
      throw new Error('BigQuery client not initialized')
    }

    let query = `
      SELECT *
      FROM \`${this.projectId}.${this.dataset}.vBusinessStructure\`
    `

    if (orgIds && orgIds.length > 0) {
      const orgIdsStr = orgIds.join(',')
      query += ` WHERE orgId IN (${orgIdsStr})`
    }

    query += ` ORDER BY orgId`

    try {
      const [rows] = await this.client.query(query)
      return rows
    } catch (error: any) {
      throw new Error(`Failed to query business structure: ${error.message}`)
    }
  }

  async queryCalendarDate(dateRange?: { start: string; end: string }): Promise<any[]> {
    if (!this.client || !this.dataset) {
      throw new Error('BigQuery client not initialized')
    }

    let query = `
      SELECT *
      FROM \`${this.projectId}.${this.dataset}.vCalendarDate\`
    `

    if (dateRange) {
      query += ` WHERE calendarDate >= '${dateRange.start}' AND calendarDate <= '${dateRange.end}'`
    }

    query += ` ORDER BY calendarDate`

    try {
      const [rows] = await this.client.query(query)
      return rows
    } catch (error: any) {
      throw new Error(`Failed to query calendar date: ${error.message}`)
    }
  }

  async queryFiscalCalendar(dateRange?: { start: string; end: string }): Promise<any[]> {
    if (!this.client || !this.dataset) {
      throw new Error('BigQuery client not initialized')
    }

    let query = `
      SELECT *
      FROM \`${this.projectId}.${this.dataset}.vFiscalCalendar\`
    `

    if (dateRange) {
      query += ` WHERE fiscalDate >= '${dateRange.start}' AND fiscalDate <= '${dateRange.end}'`
    }

    query += ` ORDER BY fiscalDate`

    try {
      const [rows] = await this.client.query(query)
      return rows
    } catch (error: any) {
      throw new Error(`Failed to query fiscal calendar: ${error.message}`)
    }
  }

  // Getter methods for accessing current configuration
  getProjectId(): string {
    return this.projectId
  }

  getDataset(): string {
    return this.dataset
  }

  // Utility method to check if service is connected
  isConnected(): boolean {
    return this.client !== null && this.projectId !== '' && this.dataset !== ''
  }

  // Generic query execution method
  async executeQuery(query: string): Promise<any[]> {
    if (!this.client) {
      throw new Error('BigQuery client not initialized')
    }

    try {
      const [rows] = await this.client.query(query)
      return rows
    } catch (error: any) {
      throw new Error(`Failed to execute query: ${error.message}`)
    }
  }
} 