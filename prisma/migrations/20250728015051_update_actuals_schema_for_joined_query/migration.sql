/*
  Warnings:

  - You are about to drop the column `includeSummarySwt` on the `v_actual_volume` table. All the data in the column will be lost.
  - You are about to drop the column `linkedCategoryType` on the `v_actual_volume` table. All the data in the column will be lost.
  - You are about to drop the column `posLabel` on the `v_actual_volume` table. All the data in the column will be lost.
  - You are about to drop the column `posLabelId` on the `v_actual_volume` table. All the data in the column will be lost.
  - You are about to drop the column `updateDtm` on the `v_actual_volume` table. All the data in the column will be lost.
  - You are about to drop the column `volumeDriverId` on the `v_actual_volume` table. All the data in the column will be lost.
  - Added the required column `volumeDriver` to the `v_actual_volume` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "v_actual_volume_orgId_volumeDriverId_partitionDate_idx";

-- DropIndex
DROP INDEX "v_actual_volume_partitionDate_posLabel_idx";

-- AlterTable
ALTER TABLE "v_actual_volume" DROP COLUMN "includeSummarySwt",
DROP COLUMN "linkedCategoryType",
DROP COLUMN "posLabel",
DROP COLUMN "posLabelId",
DROP COLUMN "updateDtm",
DROP COLUMN "volumeDriverId",
ADD COLUMN     "area" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "contextName" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "orgPathTxt" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "site" TEXT,
ADD COLUMN     "volumeDriver" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "v_actual_volume_orgId_partitionDate_idx" ON "v_actual_volume"("orgId", "partitionDate");

-- CreateIndex
CREATE INDEX "v_actual_volume_partitionDate_volumeDriver_idx" ON "v_actual_volume"("partitionDate", "volumeDriver");

-- CreateIndex
CREATE INDEX "v_actual_volume_brand_region_area_idx" ON "v_actual_volume"("brand", "region", "area");

-- CreateIndex
CREATE INDEX "v_actual_volume_site_department_idx" ON "v_actual_volume"("site", "department");
