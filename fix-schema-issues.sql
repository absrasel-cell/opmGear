-- ============================================================================
-- FIX SCHEMA ISSUES FOR SUCCESSFUL MIGRATION
-- ============================================================================

-- Fix 1: Extend product code length to accommodate longer product names
ALTER TABLE products ALTER COLUMN code TYPE VARCHAR(100);

-- Fix 2: Add missing permissions for cache tables
GRANT INSERT ON pricing_cache TO service_role;
GRANT SELECT ON pricing_cache TO service_role;
GRANT UPDATE ON pricing_cache TO service_role;

GRANT INSERT ON ai_pricing_context TO service_role;
GRANT SELECT ON ai_pricing_context TO service_role;
GRANT UPDATE ON ai_pricing_context TO service_role;

-- Disable RLS for cache tables during migration
ALTER TABLE pricing_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pricing_context DISABLE ROW LEVEL SECURITY;

-- Additional: Make sure all permissions are granted
GRANT ALL ON pricing_tiers TO service_role;
GRANT ALL ON products TO service_role;
GRANT ALL ON logo_methods TO service_role;
GRANT ALL ON mold_charges TO service_role;
GRANT ALL ON premium_fabrics TO service_role;
GRANT ALL ON premium_closures TO service_role;
GRANT ALL ON accessories TO service_role;
GRANT ALL ON delivery_methods TO service_role;
GRANT ALL ON pricing_cache TO service_role;
GRANT ALL ON ai_pricing_context TO service_role;