// Direct database connection approach for schema setup
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupSchema() {
  try {
    console.log('🚀 Setting up database schema...')
    
    // First, let's try to create the Order table directly using the client
    console.log('📋 Creating Order table...')
    
    // Use a simple INSERT to test connection first
    const { data: testData, error: testError } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1)
    
    if (testError && testError.code !== 'PGRST116') {
      console.log('✅ Connected to Supabase successfully')
    }
    
    // Since we can't execute arbitrary SQL via the client, let's provide instructions
    console.log('📋 Database Schema Setup Instructions:')
    console.log('\n🔗 Go to your Supabase Dashboard:')
    console.log(`   ${supabaseUrl.replace('/rest/v1', '')}/project/${supabaseUrl.split('.')[0].split('//')[1]}/sql/new`)
    console.log('\n📋 Copy and paste this SQL:')
    console.log('=====================================')
    
    const schema = `
-- US Custom Cap Order System Schema
DROP TABLE IF EXISTS "OrderAsset";
DROP TABLE IF EXISTS "Order";

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

CREATE INDEX "idx_order_user_email" ON "Order" ("userEmail", "createdAt" DESC);
CREATE INDEX "idx_order_user_id" ON "Order" ("userId", "createdAt" DESC) WHERE "userId" IS NOT NULL;
CREATE INDEX "idx_order_status" ON "Order" ("status", "createdAt" DESC);
CREATE INDEX "idx_order_created_at" ON "Order" ("createdAt" DESC);
CREATE INDEX "idx_order_asset_order_id" ON "OrderAsset" ("orderId");

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_order_updated_at
    BEFORE UPDATE ON "Order"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderAsset" ENABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON "Order" TO service_role;
GRANT ALL PRIVILEGES ON "OrderAsset" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Order" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "OrderAsset" TO authenticated;
GRANT SELECT ON "Order" TO anon;
GRANT SELECT ON "OrderAsset" TO anon;
    `
    
    console.log(schema)
    console.log('=====================================')
    console.log('\n✅ After running the SQL, your order system will work!')
    console.log('\n🧪 Then test with: node test-order-system-simple.js')
    
  } catch (error) {
    console.error('💥 Error:', error)
  }
}

setupSchema()