-- AlterTable
ALTER TABLE "v_volume_forecast" ADD COLUMN     "area" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "contextName" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "orgPathTxt" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "site" TEXT;

-- CreateIndex
CREATE INDEX "v_volume_forecast_brand_region_area_idx" ON "v_volume_forecast"("brand", "region", "area");

-- CreateIndex
CREATE INDEX "v_volume_forecast_site_department_idx" ON "v_volume_forecast"("site", "department");
