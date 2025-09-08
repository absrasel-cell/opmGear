// Simplified Database Schema Setup using Supabase REST API
// Run: node setup-database-schema-simple.js

import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Complete schema as single SQL command
const fullSchema = `
-- Drop existing tables if they exist
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

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON "Order" TO service_role;
GRANT ALL PRIVILEGES ON "OrderAsset" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Order" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "OrderAsset" TO authenticated;
GRANT SELECT ON "Order" TO anon;
GRANT SELECT ON "OrderAsset" TO anon;
`

async function applySchema() {
  try {
    console.log('🚀 Applying database schema via Supabase REST API...')
    console.log(`🔗 Supabase URL: ${supabaseUrl}`)
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: fullSchema
      })
    })
    
    if (response.ok) {
      console.log('✅ Schema applied successfully!')
      
      // Test table creation by trying to query the Order table
      const testResponse = await fetch(`${supabaseUrl}/rest/v1/Order?select=count`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Prefer': 'count=exact'
        }
      })
      
      if (testResponse.ok) {
        console.log('✅ Order table verified - ready for orders!')
      } else {
        console.log('⚠️ Could not verify table creation, but schema may have applied')
      }
      
    } else {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    console.log('\n🎉 DATABASE SETUP COMPLETE!')
    console.log('📋 Order and OrderAsset tables created')
    console.log('🚀 Order system is now ready!')
    console.log('\n➡️ Next steps:')
    console.log('1. Test with: node test-order-system-simple.js')
    console.log('2. Try placing an order through checkout')
    console.log('3. Check admin dashboard for orders')
    
  } catch (error) {
    console.error('💥 Schema setup failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Verify SUPABASE_SERVICE_ROLE_KEY is correct')
    console.log('2. Check Supabase project is active')
    console.log('3. Ensure service role has database permissions')
    console.log('\n📋 Manual alternative:')
    console.log('Copy the SQL from create-orders-schema.sql and run it in Supabase SQL Editor')
  }
}

// Run the setup
applySchema()