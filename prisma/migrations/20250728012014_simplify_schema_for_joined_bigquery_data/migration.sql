/*
  Warnings:

  - You are about to drop the column `currency` on the `v_volume_forecast` table. All the data in the column will be lost.
  - You are about to drop the column `currencyId` on the `v_volume_forecast` table. All the data in the column will be lost.
  - You are about to drop the column `eventRatio` on the `v_volume_forecast` table. All the data in the column will be lost.
  - You are about to drop the column `includeSummarySwt` on the `v_volume_forecast` table. All the data in the column will be lost.
  - You are about to drop the column `linkedCategoryType` on the `v_volume_forecast` table. All the data in the column will be lost.
  - You are about to drop the column `updateDtm` on the `v_volume_forecast` table. All the data in the column will be lost.
  - You are about to drop the column `volumeDriverId` on the `v_volume_forecast` table. All the data in the column will be lost.
  - You are about to drop the column `volumeTypeId` on the `v_volume_forecast` table. All the data in the column will be lost.
  - You are about to drop the `v_business_structure` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "v_actual_volume" DROP CONSTRAINT "v_actual_volume_orgId_fkey";

-- DropForeignKey
ALTER TABLE "v_volume_forecast" DROP CONSTRAINT "v_volume_forecast_orgId_fkey";

-- DropIndex
DROP INDEX "v_volume_forecast_orgId_volumeTypeId_partitionDate_idx";

-- AlterTable
ALTER TABLE "v_volume_forecast" DROP COLUMN "currency",
DROP COLUMN "currencyId",
DROP COLUMN "eventRatio",
DROP COLUMN "includeSummarySwt",
DROP COLUMN "linkedCategoryType",
DROP COLUMN "updateDtm",
DROP COLUMN "volumeDriverId",
DROP COLUMN "volumeTypeId";

-- DropTable
DROP TABLE "v_business_structure";

-- CreateIndex
CREATE INDEX "v_volume_forecast_orgId_partitionDate_idx" ON "v_volume_forecast"("orgId", "partitionDate");
