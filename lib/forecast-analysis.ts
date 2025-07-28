import { prisma } from './prisma'

export interface AccuracyDistribution {
  label: string
  count: number
  percentage: number
}

export interface SummaryMetrics {
  meanAccuracy: number
  medianAccuracy: number
  standardDeviation: number
  totalDataPoints: number
  withinTenPercent: number
  withinTwentyPercent: number
}

export interface ComparisonResult {
  runs: Array<{
    runId: string
    distribution: AccuracyDistribution[]
    summary: SummaryMetrics
  }>
  bestPerforming: string
  statisticalSignificance: StatisticalTest[]
}

export interface StatisticalTest {
  test: string
  pValue: number
  significant: boolean
  description: string
}

export interface DepartmentMetrics {
  volumeType: string
  volumeDriver: string
  totalRecords: number
  avgAccuracyPercent: number
  stdDevAccuracy: number
}

export interface OrgHierarchy {
  orgId: number
  parentOrgId?: number
  name: string
  fullName: string
  orgLevel: string
  orgTypeName: string
  children: OrgHierarchy[]
}

export class ForecastAnalysisService {
  
  async calculateAccuracyDistribution(runId: string): Promise<AccuracyDistribution[]> {
    // Join forecast and actual data to calculate accuracy per organization
    const accuracyData = await prisma.$queryRaw<Array<{
      orgId: number
      orgName: string
      orgLevel: string
      partitionDate: Date
      forecastValue: number
      actualValue: number
      accuracyPercent: number
    }>>`
      SELECT 
        bs.orgId,
        bs.name as "orgName",
        bs."orgLevel",
        vf."partitionDate",
        vf."dailyAmount" as "forecastValue",
        va."dailyAmount" as "actualValue",
        CASE 
          WHEN va."dailyAmount" = 0 THEN NULL
          ELSE ABS(vf."dailyAmount" - va."dailyAmount") / va."dailyAmount" * 100
        END as "accuracyPercent"
      FROM v_volume_forecast vf
      INNER JOIN v_actual_volume va ON 
        vf."orgId" = va."orgId" 
        AND vf."partitionDate" = va."partitionDate"
        AND vf."runId" = va."runId"
      INNER JOIN v_business_structure bs ON vf."orgId" = bs."orgId"
      WHERE vf."runId" = ${runId}
        AND va."dailyAmount" > 0
    `
    
    // Group by accuracy brackets for bell curve distribution
    return this.groupByAccuracyBrackets(accuracyData)
  }
  
  private groupByAccuracyBrackets(data: Array<{ accuracyPercent: number }>): AccuracyDistribution[] {
    const brackets = [
      { min: 0, max: 10, label: '90-100%' },
      { min: 10, max: 20, label: '80-90%' },
      { min: 20, max: 30, label: '70-80%' },
      { min: 30, max: 40, label: '60-70%' },
      { min: 40, max: 50, label: '50-60%' },
      { min: 50, max: 60, label: '40-50%' },
      { min: 60, max: 70, label: '30-40%' },
      { min: 70, max: 80, label: '20-30%' },
      { min: 80, max: 90, label: '10-20%' },
      { min: 90, max: 100, label: '0-10%' },
    ]
    
    return brackets.map(bracket => {
      const count = data.filter(d => 
        d.accuracyPercent >= bracket.min && 
        d.accuracyPercent < bracket.max
      ).length
      
      return {
        label: bracket.label,
        count,
        percentage: data.length > 0 ? (count / data.length) * 100 : 0
      }
    })
  }
  
  async calculateSummaryMetrics(runId: string): Promise<SummaryMetrics> {
    const accuracyData = await prisma.$queryRaw<Array<{ accuracyPercent: number }>>`
      SELECT 
        CASE 
          WHEN va."dailyAmount" = 0 THEN NULL
          ELSE ABS(vf."dailyAmount" - va."dailyAmount") / va."dailyAmount" * 100
        END as "accuracyPercent"
      FROM v_volume_forecast vf
      INNER JOIN v_actual_volume va ON 
        vf."orgId" = va."orgId" 
        AND vf."partitionDate" = va."partitionDate"
        AND vf."runId" = va."runId"
      WHERE vf."runId" = ${runId}
        AND va."dailyAmount" > 0
    `
    
    const validAccuracies = accuracyData
      .map((d: { accuracyPercent: number | null }) => d.accuracyPercent)
      .filter((acc: number | null): acc is number => acc !== null)
    
    if (validAccuracies.length === 0) {
      return {
        meanAccuracy: 0,
        medianAccuracy: 0,
        standardDeviation: 0,
        totalDataPoints: 0,
        withinTenPercent: 0,
        withinTwentyPercent: 0
      }
    }
    
    const mean = validAccuracies.reduce((sum: number, acc: number) => sum + acc, 0) / validAccuracies.length
    const sorted = validAccuracies.sort((a: number, b: number) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    
    const variance = validAccuracies.reduce((sum: number, acc: number) => sum + Math.pow(acc - mean, 2), 0) / validAccuracies.length
    const stdDev = Math.sqrt(variance)
    
    const withinTenPercent = validAccuracies.filter((acc: number) => acc <= 10).length
    const withinTwentyPercent = validAccuracies.filter((acc: number) => acc <= 20).length
    
    return {
      meanAccuracy: mean,
      medianAccuracy: median,
      standardDeviation: stdDev,
      totalDataPoints: validAccuracies.length,
      withinTenPercent,
      withinTwentyPercent
    }
  }
  
  async compareMultipleRuns(runIds: string[]): Promise<ComparisonResult> {
    // Compare accuracy across multiple forecast runs
    const comparisons = await Promise.all(
      runIds.map(async (runId) => ({
        runId,
        distribution: await this.calculateAccuracyDistribution(runId),
        summary: await this.calculateSummaryMetrics(runId)
      }))
    )
    
    return {
      runs: comparisons,
      bestPerforming: this.identifyBestPerforming(comparisons),
      statisticalSignificance: await this.calculateStatisticalSignificance(runIds)
    }
  }
  
  private identifyBestPerforming(comparisons: Array<{ runId: string; summary: SummaryMetrics }>): string {
    if (comparisons.length === 0) return ''
    
    // Find the run with the lowest mean accuracy (best performance)
    return comparisons.reduce((best, current) => 
      current.summary.meanAccuracy < best.summary.meanAccuracy ? current : best
    ).runId
  }
  
  async calculateStatisticalSignificance(runIds: string[]): Promise<StatisticalTest[]> {
    if (runIds.length < 2) {
      return []
    }
    
    // This is a simplified statistical test - in production you'd use proper statistical libraries
    const tests: StatisticalTest[] = []
    
    // Compare each pair of runs
    for (let i = 0; i < runIds.length - 1; i++) {
      for (let j = i + 1; j < runIds.length; j++) {
        const run1 = runIds[i]
        const run2 = runIds[j]
        
        const summary1 = await this.calculateSummaryMetrics(run1)
        const summary2 = await this.calculateSummaryMetrics(run2)
        
        // Simple t-test approximation
        const diff = Math.abs(summary1.meanAccuracy - summary2.meanAccuracy)
        const pooledStd = Math.sqrt((summary1.standardDeviation ** 2 + summary2.standardDeviation ** 2) / 2)
        const tStat = diff / (pooledStd * Math.sqrt(2 / Math.min(summary1.totalDataPoints, summary2.totalDataPoints)))
        
        // Simplified p-value calculation (this is not a proper t-test)
        const pValue = Math.exp(-tStat / 2)
        const significant = pValue < 0.05
        
        tests.push({
          test: `Run ${run1} vs Run ${run2}`,
          pValue,
          significant,
          description: `Comparison between forecast runs ${run1} and ${run2}`
        })
      }
    }
    
    return tests
  }
  
  async getOrganizationHierarchy(): Promise<OrgHierarchy[]> {
    // Build organization hierarchy for filtering and grouping
    const orgs = await prisma.vBusinessStructure.findMany({
      select: {
        orgId: true,
        parentOrgId: true,
        name: true,
        fullName: true,
        orgLevel: true,
        orgTypeName: true,
        orgBreak1: true,
        orgBreak1Desc: true,
        orgBreak2: true,
        orgBreak2Desc: true,
        orgBreak3: true,
        orgBreak3Desc: true,
      }
    })
    
    return this.buildHierarchy(orgs)
  }
  
  private buildHierarchy(orgs: any[]): OrgHierarchy[] {
    const orgMap = new Map<number, OrgHierarchy>()
    const roots: OrgHierarchy[] = []
    
    // Create map of all organizations
    orgs.forEach(org => {
      orgMap.set(org.orgId, {
        orgId: org.orgId,
        parentOrgId: org.parentOrgId,
        name: org.name,
        fullName: org.fullName,
        orgLevel: org.orgLevel,
        orgTypeName: org.orgTypeName,
        children: []
      })
    })
    
    // Build hierarchy
    orgs.forEach(org => {
      const orgNode = orgMap.get(org.orgId)!
      
      if (org.parentOrgId && orgMap.has(org.parentOrgId)) {
        const parent = orgMap.get(org.parentOrgId)!
        parent.children.push(orgNode)
      } else {
        roots.push(orgNode)
      }
    })
    
    return roots
  }
  
  async getDepartmentPerformance(runId: string): Promise<DepartmentMetrics[]> {
    // Analyze performance by department/volume type
    return await prisma.$queryRaw<DepartmentMetrics[]>`
      SELECT 
        vf."volumeType",
        vf."volumeDriver",
        COUNT(*) as "totalRecords",
        AVG(CASE 
          WHEN va."dailyAmount" = 0 THEN NULL
          ELSE ABS(vf."dailyAmount" - va."dailyAmount") / va."dailyAmount" * 100
        END) as "avgAccuracyPercent",
        STDDEV(CASE 
          WHEN va."dailyAmount" = 0 THEN NULL
          ELSE ABS(vf."dailyAmount" - va."dailyAmount") / va."dailyAmount" * 100
        END) as "stdDevAccuracy"
      FROM v_volume_forecast vf
      INNER JOIN v_actual_volume va ON 
        vf."orgId" = va."orgId" 
        AND vf."partitionDate" = va."partitionDate"
        AND vf."runId" = va."runId"
      WHERE vf."runId" = ${runId}
        AND va."dailyAmount" > 0
      GROUP BY vf."volumeType", vf."volumeDriver"
      ORDER BY "avgAccuracyPercent" DESC
    `
  }
  
  async getTimeSeriesAccuracy(runId: string, orgId?: number): Promise<Array<{
    date: string
    accuracy: number
    forecastValue: number
    actualValue: number
  }>> {
    const orgFilter = orgId ? `AND vf."orgId" = ${orgId}` : ''
    
    return await prisma.$queryRaw<Array<{
      date: string
      accuracy: number
      forecastValue: number
      actualValue: number
    }>>`
      SELECT 
        vf."partitionDate"::text as date,
        CASE 
          WHEN va."dailyAmount" = 0 THEN NULL
          ELSE ABS(vf."dailyAmount" - va."dailyAmount") / va."dailyAmount" * 100
        END as accuracy,
        vf."dailyAmount" as "forecastValue",
        va."dailyAmount" as "actualValue"
      FROM v_volume_forecast vf
      INNER JOIN v_actual_volume va ON 
        vf."orgId" = va."orgId" 
        AND vf."partitionDate" = va."partitionDate"
        AND vf."runId" = va."runId"
      WHERE vf."runId" = ${runId}
        AND va."dailyAmount" > 0
        ${orgFilter}
      ORDER BY vf."partitionDate"
    `
  }
  
  async getTopPerformers(runId: string, limit: number = 10): Promise<Array<{
    orgId: number
    orgName: string
    avgAccuracy: number
    totalRecords: number
  }>> {
    return await prisma.$queryRaw<Array<{
      orgId: number
      orgName: string
      avgAccuracy: number
      totalRecords: number
    }>>`
      SELECT 
        bs."orgId",
        bs.name as "orgName",
        AVG(CASE 
          WHEN va."dailyAmount" = 0 THEN NULL
          ELSE ABS(vf."dailyAmount" - va."dailyAmount") / va."dailyAmount" * 100
        END) as "avgAccuracy",
        COUNT(*) as "totalRecords"
      FROM v_volume_forecast vf
      INNER JOIN v_actual_volume va ON 
        vf."orgId" = va."orgId" 
        AND vf."partitionDate" = va."partitionDate"
        AND vf."runId" = va."runId"
      INNER JOIN v_business_structure bs ON vf."orgId" = bs."orgId"
      WHERE vf."runId" = ${runId}
        AND va."dailyAmount" > 0
      GROUP BY bs."orgId", bs.name
      HAVING COUNT(*) >= 10
      ORDER BY "avgAccuracy" ASC
      LIMIT ${limit}
    `
  }
  
  async getWorstPerformers(runId: string, limit: number = 10): Promise<Array<{
    orgId: number
    orgName: string
    avgAccuracy: number
    totalRecords: number
  }>> {
    return await prisma.$queryRaw<Array<{
      orgId: number
      orgName: string
      avgAccuracy: number
      totalRecords: number
    }>>`
      SELECT 
        bs."orgId",
        bs.name as "orgName",
        AVG(CASE 
          WHEN va."dailyAmount" = 0 THEN NULL
          ELSE ABS(vf."dailyAmount" - va."dailyAmount") / va."dailyAmount" * 100
        END) as "avgAccuracy",
        COUNT(*) as "totalRecords"
      FROM v_volume_forecast vf
      INNER JOIN v_actual_volume va ON 
        vf."orgId" = va."orgId" 
        AND vf."partitionDate" = va."partitionDate"
        AND vf."runId" = va."runId"
      INNER JOIN v_business_structure bs ON vf."orgId" = bs."orgId"
      WHERE vf."runId" = ${runId}
        AND va."dailyAmount" > 0
      GROUP BY bs."orgId", bs.name
      HAVING COUNT(*) >= 10
      ORDER BY "avgAccuracy" DESC
      LIMIT ${limit}
    `
  }
} 