-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ComparisonModelStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('BIGQUERY', 'UKG_DIMENSIONS', 'FILE_UPLOAD', 'API');

-- CreateEnum
CREATE TYPE "DataLoadStatus" AS ENUM ('PENDING', 'LOADING', 'COMPLETED', 'FAILED', 'VALIDATING');

-- CreateEnum
CREATE TYPE "ForecastModelType" AS ENUM ('UKG_DIMENSIONS', 'HISTORICAL_AVERAGE', 'MACHINE_LEARNING', 'SEASONAL_NAIVE', 'EXPONENTIAL_SMOOTHING', 'ARIMA', 'PROPHET', 'CUSTOM');

-- CreateTable
CREATE TABLE "environments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bigqueryProjectId" TEXT NOT NULL,
    "bigqueryDataset" TEXT NOT NULL,
    "bigqueryCredentials" JSONB,
    "ukgProUrl" TEXT,
    "ukgProClientId" TEXT,
    "ukgProClientSecret" TEXT,
    "ukgProAppKey" TEXT,
    "ukgProUsername" TEXT,
    "ukgProPassword" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ukgModelId" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_comparison_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "environmentId" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" "ComparisonModelStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forecast_comparison_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actuals_datasets" (
    "id" TEXT NOT NULL,
    "comparisonModelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataSource" "DataSourceType" NOT NULL,
    "bigqueryTable" TEXT,
    "uploadedFile" TEXT,
    "recordCount" INTEGER,
    "dateRange" JSONB,
    "loadStatus" "DataLoadStatus" NOT NULL DEFAULT 'PENDING',
    "loadedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actuals_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_datasets" (
    "id" TEXT NOT NULL,
    "comparisonModelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelType" "ForecastModelType" NOT NULL,
    "dataSource" "DataSourceType" NOT NULL,
    "bigqueryTable" TEXT,
    "ukgDimensionsJobId" TEXT,
    "uploadedFile" TEXT,
    "recordCount" INTEGER,
    "dateRange" JSONB,
    "loadStatus" "DataLoadStatus" NOT NULL DEFAULT 'PENDING',
    "loadedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_runs" (
    "id" TEXT NOT NULL,
    "comparisonModelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "selectedForecastIds" TEXT[],
    "filters" JSONB,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "accuracyMetrics" JSONB,
    "statisticalAnalysis" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_results" (
    "id" TEXT NOT NULL,
    "comparisonRunId" TEXT NOT NULL,
    "forecastDatasetId" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "partitionDate" TIMESTAMP(3) NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "forecastValue" DOUBLE PRECISION NOT NULL,
    "absoluteError" DOUBLE PRECISION NOT NULL,
    "percentageError" DOUBLE PRECISION NOT NULL,
    "accuracyScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_runs" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "dimensionsJobId" TEXT,
    "bigqueryProjectId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "dataPoints" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v_volume_forecast" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "forecastDatasetId" TEXT,
    "orgId" INTEGER NOT NULL,
    "partitionDate" TIMESTAMP(3) NOT NULL,
    "volumeType" TEXT NOT NULL,
    "volumeTypeId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "eventRatio" DOUBLE PRECISION NOT NULL,
    "dailyAmount" DOUBLE PRECISION NOT NULL,
    "volumeDriver" TEXT NOT NULL,
    "volumeDriverId" INTEGER NOT NULL,
    "updateDtm" TIMESTAMP(3) NOT NULL,
    "linkedCategoryType" TEXT NOT NULL,
    "includeSummarySwt" BOOLEAN NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v_volume_forecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v_actual_volume" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "actualsDatasetId" TEXT,
    "orgId" INTEGER NOT NULL,
    "partitionDate" TIMESTAMP(3) NOT NULL,
    "dailyAmount" DOUBLE PRECISION NOT NULL,
    "volumeDriverId" INTEGER NOT NULL,
    "posLabel" TEXT NOT NULL,
    "posLabelId" INTEGER NOT NULL,
    "updateDtm" TIMESTAMP(3) NOT NULL,
    "linkedCategoryType" TEXT NOT NULL,
    "includeSummarySwt" BOOLEAN NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v_actual_volume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v_business_structure" (
    "orgId" INTEGER NOT NULL,
    "orgBreak1" TEXT,
    "orgBreak2" TEXT,
    "orgBreak3" TEXT,
    "orgBreak4" TEXT,
    "orgBreak5" TEXT,
    "orgBreak6" TEXT,
    "orgBreak7" TEXT,
    "orgBreak8" TEXT,
    "orgBreak9" TEXT,
    "orgBreak10" TEXT,
    "orgBreak11" TEXT,
    "orgBreak12" TEXT,
    "orgBreak13" TEXT,
    "orgBreak14" TEXT,
    "orgBreak15" TEXT,
    "orgBreak16" TEXT,
    "orgBreak17" TEXT,
    "orgBreak18" TEXT,
    "orgBreak19" TEXT,
    "orgBreak20" TEXT,
    "orgBreak21" TEXT,
    "orgBreak22" TEXT,
    "orgBreak23" TEXT,
    "orgBreak24" TEXT,
    "orgBreak25" TEXT,
    "updateDtm" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v_business_structure_pkey" PRIMARY KEY ("orgId")
);

-- CreateTable
CREATE TABLE "v_calendar_date" (
    "id" TEXT NOT NULL,
    "calendarDate" TIMESTAMP(3) NOT NULL,
    "calendarYear" INTEGER NOT NULL,
    "calendarMonth" INTEGER NOT NULL,
    "calendarDay" INTEGER NOT NULL,
    "calendarWeek" INTEGER NOT NULL,
    "calendarQuarter" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "dayOfYear" INTEGER NOT NULL,
    "isWeekend" BOOLEAN NOT NULL,
    "isHoliday" BOOLEAN NOT NULL,
    "holidayName" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v_calendar_date_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v_fiscal_calendar" (
    "id" TEXT NOT NULL,
    "fiscalDate" TIMESTAMP(3) NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "fiscalMonth" INTEGER NOT NULL,
    "fiscalDay" INTEGER NOT NULL,
    "fiscalWeek" INTEGER NOT NULL,
    "fiscalQuarter" INTEGER NOT NULL,
    "fiscalPeriod" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v_fiscal_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "environments_name_key" ON "environments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_comparison_models_name_key" ON "forecast_comparison_models"("name");

-- CreateIndex
CREATE UNIQUE INDEX "actuals_datasets_comparisonModelId_key" ON "actuals_datasets"("comparisonModelId");

-- CreateIndex
CREATE INDEX "comparison_results_comparisonRunId_forecastDatasetId_idx" ON "comparison_results"("comparisonRunId", "forecastDatasetId");

-- CreateIndex
CREATE INDEX "comparison_results_orgId_partitionDate_idx" ON "comparison_results"("orgId", "partitionDate");

-- CreateIndex
CREATE INDEX "v_volume_forecast_runId_partitionDate_idx" ON "v_volume_forecast"("runId", "partitionDate");

-- CreateIndex
CREATE INDEX "v_volume_forecast_forecastDatasetId_partitionDate_idx" ON "v_volume_forecast"("forecastDatasetId", "partitionDate");

-- CreateIndex
CREATE INDEX "v_volume_forecast_orgId_volumeTypeId_partitionDate_idx" ON "v_volume_forecast"("orgId", "volumeTypeId", "partitionDate");

-- CreateIndex
CREATE INDEX "v_volume_forecast_partitionDate_volumeType_idx" ON "v_volume_forecast"("partitionDate", "volumeType");

-- CreateIndex
CREATE INDEX "v_actual_volume_runId_partitionDate_idx" ON "v_actual_volume"("runId", "partitionDate");

-- CreateIndex
CREATE INDEX "v_actual_volume_actualsDatasetId_partitionDate_idx" ON "v_actual_volume"("actualsDatasetId", "partitionDate");

-- CreateIndex
CREATE INDEX "v_actual_volume_orgId_volumeDriverId_partitionDate_idx" ON "v_actual_volume"("orgId", "volumeDriverId", "partitionDate");

-- CreateIndex
CREATE INDEX "v_actual_volume_partitionDate_posLabel_idx" ON "v_actual_volume"("partitionDate", "posLabel");

-- CreateIndex
CREATE INDEX "v_business_structure_orgBreak1_orgBreak2_orgBreak3_idx" ON "v_business_structure"("orgBreak1", "orgBreak2", "orgBreak3");

-- CreateIndex
CREATE INDEX "v_business_structure_orgBreak5_orgBreak10_orgBreak15_idx" ON "v_business_structure"("orgBreak5", "orgBreak10", "orgBreak15");

-- CreateIndex
CREATE UNIQUE INDEX "v_calendar_date_calendarDate_key" ON "v_calendar_date"("calendarDate");

-- CreateIndex
CREATE INDEX "v_calendar_date_calendarDate_idx" ON "v_calendar_date"("calendarDate");

-- CreateIndex
CREATE INDEX "v_calendar_date_calendarYear_calendarMonth_idx" ON "v_calendar_date"("calendarYear", "calendarMonth");

-- CreateIndex
CREATE INDEX "v_calendar_date_calendarWeek_idx" ON "v_calendar_date"("calendarWeek");

-- CreateIndex
CREATE UNIQUE INDEX "v_fiscal_calendar_fiscalDate_key" ON "v_fiscal_calendar"("fiscalDate");

-- CreateIndex
CREATE INDEX "v_fiscal_calendar_fiscalDate_idx" ON "v_fiscal_calendar"("fiscalDate");

-- CreateIndex
CREATE INDEX "v_fiscal_calendar_fiscalYear_fiscalMonth_idx" ON "v_fiscal_calendar"("fiscalYear", "fiscalMonth");

-- CreateIndex
CREATE INDEX "v_fiscal_calendar_fiscalWeek_idx" ON "v_fiscal_calendar"("fiscalWeek");

-- AddForeignKey
ALTER TABLE "forecast_comparison_models" ADD CONSTRAINT "forecast_comparison_models_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actuals_datasets" ADD CONSTRAINT "actuals_datasets_comparisonModelId_fkey" FOREIGN KEY ("comparisonModelId") REFERENCES "forecast_comparison_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_datasets" ADD CONSTRAINT "forecast_datasets_comparisonModelId_fkey" FOREIGN KEY ("comparisonModelId") REFERENCES "forecast_comparison_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_runs" ADD CONSTRAINT "comparison_runs_comparisonModelId_fkey" FOREIGN KEY ("comparisonModelId") REFERENCES "forecast_comparison_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_results" ADD CONSTRAINT "comparison_results_comparisonRunId_fkey" FOREIGN KEY ("comparisonRunId") REFERENCES "comparison_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_results" ADD CONSTRAINT "comparison_results_forecastDatasetId_fkey" FOREIGN KEY ("forecastDatasetId") REFERENCES "forecast_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_runs" ADD CONSTRAINT "forecast_runs_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_runs" ADD CONSTRAINT "forecast_runs_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "forecast_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v_volume_forecast" ADD CONSTRAINT "v_volume_forecast_runId_fkey" FOREIGN KEY ("runId") REFERENCES "forecast_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v_volume_forecast" ADD CONSTRAINT "v_volume_forecast_forecastDatasetId_fkey" FOREIGN KEY ("forecastDatasetId") REFERENCES "forecast_datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v_volume_forecast" ADD CONSTRAINT "v_volume_forecast_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "v_business_structure"("orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v_actual_volume" ADD CONSTRAINT "v_actual_volume_runId_fkey" FOREIGN KEY ("runId") REFERENCES "forecast_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v_actual_volume" ADD CONSTRAINT "v_actual_volume_actualsDatasetId_fkey" FOREIGN KEY ("actualsDatasetId") REFERENCES "actuals_datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v_actual_volume" ADD CONSTRAINT "v_actual_volume_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "v_business_structure"("orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
