-- ============================================================================
-- TEMPORARY PERMISSIONS FIX FOR CSV MIGRATION
-- Execute this in Supabase SQL Editor before running migration
-- ============================================================================

-- Temporarily allow service role full access for migration
-- This will be reverted after migration is complete

-- Grant INSERT permissions to service role for migration
GRANT INSERT ON pricing_tiers TO service_role;
GRANT INSERT ON products TO service_role;
GRANT INSERT ON logo_methods TO service_role;
GRANT INSERT ON mold_charges TO service_role;
GRANT INSERT ON premium_fabrics TO service_role;
GRANT INSERT ON premium_closures TO service_role;
GRANT INSERT ON accessories TO service_role;
GRANT INSERT ON delivery_methods TO service_role;

-- Grant SELECT permissions for relationship lookups
GRANT SELECT ON pricing_tiers TO service_role;
GRANT SELECT ON products TO service_role;
GRANT SELECT ON logo_methods TO service_role;
GRANT SELECT ON mold_charges TO service_role;
GRANT SELECT ON premium_fabrics TO service_role;
GRANT SELECT ON premium_closures TO service_role;
GRANT SELECT ON accessories TO service_role;
GRANT SELECT ON delivery_methods TO service_role;

-- Grant UPDATE permissions for upserts
GRANT UPDATE ON pricing_tiers TO service_role;
GRANT UPDATE ON products TO service_role;
GRANT UPDATE ON logo_methods TO service_role;
GRANT UPDATE ON mold_charges TO service_role;
GRANT UPDATE ON premium_fabrics TO service_role;
GRANT UPDATE ON premium_closures TO service_role;
GRANT UPDATE ON accessories TO service_role;
GRANT UPDATE ON delivery_methods TO service_role;

-- Temporary bypass RLS for service role during migration
ALTER TABLE pricing_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE logo_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE mold_charges DISABLE ROW LEVEL SECURITY;
ALTER TABLE premium_fabrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE premium_closures DISABLE ROW LEVEL SECURITY;
ALTER TABLE accessories DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_methods DISABLE ROW LEVEL SECURITY;

-- Note: We'll re-enable RLS after successful migration