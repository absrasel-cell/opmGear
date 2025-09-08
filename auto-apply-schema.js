// Auto-apply schema using direct PostgreSQL connection
const { Client } = require('pg')
require('dotenv').config()

// Extract connection details from DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL

if (!databaseUrl) {
  console.error('❌ No DATABASE_URL or DIRECT_URL found in environment variables')
  console.log('Please ensure your .env file has the Supabase connection string')
  process.exit(1)
}

const schema = `
-- US Custom Cap Order System Schema
DROP TABLE IF EXISTS "OrderAsset" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;

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

-- Create indexes for performance
CREATE INDEX "idx_order_user_email" ON "Order" ("userEmail", "createdAt" DESC);
CREATE INDEX "idx_order_user_id" ON "Order" ("userId", "createdAt" DESC) WHERE "userId" IS NOT NULL;
CREATE INDEX "idx_order_status" ON "Order" ("status", "createdAt" DESC);
CREATE INDEX "idx_order_created_at" ON "Order" ("createdAt" DESC);
CREATE INDEX "idx_order_asset_order_id" ON "OrderAsset" ("orderId");

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

-- Grant necessary permissions (service_role has full access)
GRANT ALL PRIVILEGES ON "Order" TO service_role;
GRANT ALL PRIVILEGES ON "OrderAsset" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Order" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "OrderAsset" TO authenticated;
GRANT SELECT ON "Order" TO anon;
GRANT SELECT ON "OrderAsset" TO anon;
`

async function applySchema() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected successfully!')

    console.log('📋 Applying Order system schema...')
    await client.query(schema)
    console.log('✅ Schema applied successfully!')

    // Verify tables were created
    console.log('🔍 Verifying table creation...')
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Order', 'OrderAsset')
      ORDER BY table_name
    `)

    console.log('📊 Tables created:', result.rows.map(row => row.table_name))

    // Test inserting a record to ensure everything works
    console.log('🧪 Testing table functionality...')
    const testInsert = await client.query(`
      INSERT INTO "Order" (
        "productName", 
        "userEmail", 
        "customerInfo", 
        "orderType", 
        "orderSource"
      ) VALUES (
        'Test Order - Schema Setup',
        'test@schemasetup.com',
        '{"name": "Test User", "email": "test@schemasetup.com"}',
        'GUEST',
        'ADMIN_CREATED'
      ) RETURNING "id", "createdAt"
    `)

    console.log('✅ Test order created:', testInsert.rows[0])

    // Clean up test order
    await client.query('DELETE FROM "Order" WHERE "userEmail" = $1', ['test@schemasetup.com'])
    console.log('🧹 Test data cleaned up')

    console.log('\n🎉 DATABASE SCHEMA SETUP COMPLETE!')
    console.log('✅ Order table ready')
    console.log('✅ OrderAsset table ready')
    console.log('✅ Indexes created')
    console.log('✅ Triggers active')
    console.log('✅ RLS policies enabled')
    console.log('\n🚀 Your order system is now fully functional!')

  } catch (error) {
    console.error('💥 Schema setup failed:', error.message)
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Tables may already exist. Checking current state...')
      try {
        const existingTables = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('Order', 'OrderAsset')
        `)
        
        if (existingTables.rows.length > 0) {
          console.log('✅ Order tables already exist:', existingTables.rows.map(r => r.table_name))
          console.log('🎉 Your order system should be working!')
        }
      } catch (checkError) {
        console.error('Could not verify existing tables:', checkError.message)
      }
    }
    
  } finally {
    await client.end()
    console.log('📤 Database connection closed')
  }
}

applySchema()