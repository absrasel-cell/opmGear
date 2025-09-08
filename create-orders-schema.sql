-- =====================================================================
-- Create Orders and OrderAssets Tables for US Custom Cap Supabase
-- Converts from Prisma schema to Supabase PostgreSQL
-- Date: 2025-09-07
-- =====================================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS "OrderAsset";
DROP TABLE IF EXISTS "Order";

-- Create Order table
CREATE TABLE "Order" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "productName" TEXT NOT NULL,
    "selectedColors" JSONB NOT NULL DEFAULT '{}',
    "logoSetupSelections" JSONB NOT NULL DEFAULT '{}',
    "selectedOptions" JSONB NOT NULL DEFAULT '{}',
    "multiSelectOptions" JSONB NOT NULL DEFAULT '{}',
    "customerInfo" JSONB NOT NULL,
    "uploadedLogoFiles" JSONB NOT NULL DEFAULT '[]',
    "additionalInstructions" TEXT,
    "userId" TEXT,
    "userEmail" TEXT NOT NULL,
    "orderType" TEXT NOT NULL CHECK ("orderType" IN ('AUTHENTICATED', 'GUEST')),
    "orderSource" TEXT NOT NULL CHECK ("orderSource" IN ('PRODUCT_CUSTOMIZATION', 'REORDER', 'CHECKOUT_ORDER', 'BULK_ORDER', 'ADMIN_CREATED')),
    "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    "shipmentId" TEXT,
    "trackingNumber" TEXT,
    "estimatedDelivery" TIMESTAMPTZ,
    "ipAddress" TEXT DEFAULT 'unknown',
    "userAgent" TEXT DEFAULT 'unknown',
    "totalUnits" INTEGER DEFAULT 0,
    "calculatedTotal" DECIMAL(10,2) DEFAULT 0,
    "paymentProcessed" BOOLEAN DEFAULT false,
    "processedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create OrderAsset table for file uploads
CREATE TABLE "OrderAsset" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "userId" TEXT,
    "kind" TEXT NOT NULL CHECK ("kind" IN ('LOGO', 'ACCESSORY', 'OTHER')),
    "position" TEXT,
    "bucket" TEXT NOT NULL DEFAULT 'order-assets',
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX "idx_order_user_email" ON "Order" ("userEmail", "createdAt" DESC);
CREATE INDEX "idx_order_user_id" ON "Order" ("userId", "createdAt" DESC) WHERE "userId" IS NOT NULL;
CREATE INDEX "idx_order_status" ON "Order" ("status", "createdAt" DESC);
CREATE INDEX "idx_order_shipment" ON "Order" ("shipmentId") WHERE "shipmentId" IS NOT NULL;
CREATE INDEX "idx_order_created_at" ON "Order" ("createdAt" DESC);

CREATE INDEX "idx_order_asset_order_id" ON "OrderAsset" ("orderId");
CREATE INDEX "idx_order_asset_user_id" ON "OrderAsset" ("userId") WHERE "userId" IS NOT NULL;

-- Create trigger function for updating updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updatedAt
CREATE TRIGGER update_order_updated_at
    BEFORE UPDATE ON "Order"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_asset_updated_at
    BEFORE UPDATE ON "OrderAsset"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on both tables
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderAsset" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Order table
-- Allow service_role full access (bypasses RLS anyway)
-- Allow authenticated users to access their own orders OR if they're admin

-- Policy for regular users to access their own orders
CREATE POLICY "order_user_access_policy" ON "Order"
FOR ALL USING (
    -- Service role bypasses RLS anyway
    -- Users can access orders by their userId or userEmail
    auth.uid()::text = "userId" 
    OR auth.jwt()::json->>'email' = "userEmail"
    -- Admin access
    OR EXISTS (
        SELECT 1 FROM "User" u 
        WHERE u.id = auth.uid()::text 
        AND u."accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF', 'ADMIN')
    )
);

-- Policy for OrderAsset table
CREATE POLICY "order_asset_access_policy" ON "OrderAsset"
FOR ALL USING (
    -- Access through order ownership
    EXISTS (
        SELECT 1 FROM "Order" o
        WHERE o.id = "OrderAsset"."orderId"
        AND (
            auth.uid()::text = o."userId"
            OR auth.jwt()::json->>'email' = o."userEmail"
            -- Admin access
            OR EXISTS (
                SELECT 1 FROM "User" u 
                WHERE u.id = auth.uid()::text 
                AND u."accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF', 'ADMIN')
            )
        )
    )
);

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON "Order" TO service_role;
GRANT ALL PRIVILEGES ON "OrderAsset" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON "Order" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "OrderAsset" TO authenticated;

GRANT SELECT ON "Order" TO anon;
GRANT SELECT ON "OrderAsset" TO anon;

-- Output completion message
DO $$
BEGIN
    RAISE NOTICE '=== ORDERS SCHEMA CREATION COMPLETE ===';
    RAISE NOTICE '1. ✅ Order table created with proper structure';
    RAISE NOTICE '2. ✅ OrderAsset table created for file uploads';
    RAISE NOTICE '3. ✅ Indexes created for performance';
    RAISE NOTICE '4. ✅ RLS policies enabled for security';
    RAISE NOTICE '5. ✅ Triggers created for auto-updating timestamps';
    RAISE NOTICE '=== READY FOR ORDER OPERATIONS ===';
END $$;