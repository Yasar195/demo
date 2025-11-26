-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_locations" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "branchName" TEXT,
    "is_main_branch" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "postal_code" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "operating_hours" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "store_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "geo_location_idx" ON "store_locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "store_id_idx" ON "store_locations"("store_id");

-- CreateIndex
CREATE INDEX "city_idx" ON "store_locations"("city");

-- AddForeignKey
ALTER TABLE "store_locations" ADD CONSTRAINT "store_locations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
