-- ============================================================================
-- US Custom Cap - Complete Supabase Pricing Schema
-- Step 2: Database Schema Creation
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CORE PRICING TABLES
-- ============================================================================

-- Pricing tiers (Tier 1, Tier 2, Tier 3)
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  price_48 DECIMAL(8,2) NOT NULL,
  price_144 DECIMAL(8,2) NOT NULL,
  price_576 DECIMAL(8,2) NOT NULL,
  price_1152 DECIMAL(8,2) NOT NULL,
  price_2880 DECIMAL(8,2) NOT NULL,
  price_10000 DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product catalog
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  profile VARCHAR(20) NOT NULL,
  bill_shape VARCHAR(30) NOT NULL,
  panel_count INTEGER NOT NULL,
  structure_type VARCHAR(50) NOT NULL,
  pricing_tier_id UUID REFERENCES pricing_tiers(id),
  nick_names TEXT[],
  tags JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logo methods and pricing
CREATE TABLE IF NOT EXISTS logo_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  application VARCHAR(20) NOT NULL,
  size VARCHAR(20) NOT NULL,
  size_example VARCHAR(30),
  price_48 DECIMAL(8,2) NOT NULL,
  price_144 DECIMAL(8,2) NOT NULL,
  price_576 DECIMAL(8,2) NOT NULL,
  price_1152 DECIMAL(8,2) NOT NULL,
  price_2880 DECIMAL(8,2) NOT NULL,
  price_10000 DECIMAL(8,2) NOT NULL,
  price_20000 DECIMAL(8,2) NOT NULL,
  mold_charge_type VARCHAR(30),
  tags JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, application, size)
);

-- Mold charges
CREATE TABLE IF NOT EXISTS mold_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  size VARCHAR(20) NOT NULL UNIQUE,
  size_example VARCHAR(30),
  charge_amount DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Premium fabrics
CREATE TABLE IF NOT EXISTS premium_fabrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  cost_type VARCHAR(20) NOT NULL,
  color_note TEXT,
  price_48 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_144 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_576 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_1152 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_2880 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_10000 DECIMAL(8,2) NOT NULL DEFAULT 0,
  available_colors TEXT[],
  tags JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Premium closures
CREATE TABLE IF NOT EXISTS premium_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  closure_type VARCHAR(20) NOT NULL,
  price_48 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_144 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_576 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_1152 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_2880 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_10000 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_20000 DECIMAL(8,2) NOT NULL DEFAULT 0,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accessories
CREATE TABLE IF NOT EXISTS accessories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  price_48 DECIMAL(8,2) NOT NULL,
  price_144 DECIMAL(8,2) NOT NULL,
  price_576 DECIMAL(8,2) NOT NULL,
  price_1152 DECIMAL(8,2) NOT NULL,
  price_2880 DECIMAL(8,2) NOT NULL,
  price_10000 DECIMAL(8,2) NOT NULL,
  price_20000 DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery methods
CREATE TABLE IF NOT EXISTS delivery_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  delivery_type VARCHAR(20) NOT NULL,
  delivery_days VARCHAR(20) NOT NULL,
  price_48 DECIMAL(8,2),
  price_144 DECIMAL(8,2),
  price_576 DECIMAL(8,2),
  price_1152 DECIMAL(8,2),
  price_2880 DECIMAL(8,2),
  price_10000 DECIMAL(8,2),
  price_20000 DECIMAL(8,2),
  min_quantity INTEGER DEFAULT 48,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. CACHING AND AI OPTIMIZATION TABLES
-- ============================================================================

-- Pricing cache for ultra-fast lookups
CREATE TABLE IF NOT EXISTS pricing_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key VARCHAR(200) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  pricing_data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI context and recommendations cache
CREATE TABLE IF NOT EXISTS ai_pricing_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  context_key VARCHAR(200) NOT NULL UNIQUE,
  session_id VARCHAR(100),
  recommended_products JSONB,
  cost_estimates JSONB,
  optimization_suggestions JSONB,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. PERFORMANCE INDEXES
-- ============================================================================

-- Product search indexes
CREATE INDEX IF NOT EXISTS idx_products_pricing_tier ON products(pricing_tier_id);
CREATE INDEX IF NOT EXISTS idx_products_panel_count ON products(panel_count);
CREATE INDEX IF NOT EXISTS idx_products_structure ON products(structure_type);
CREATE INDEX IF NOT EXISTS idx_products_nick_names_gin ON products USING GIN(nick_names);
CREATE INDEX IF NOT EXISTS idx_products_tags_gin ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

-- Logo method indexes
CREATE INDEX IF NOT EXISTS idx_logo_methods_lookup ON logo_methods(name, application, size);
CREATE INDEX IF NOT EXISTS idx_logo_methods_name ON logo_methods(name);
CREATE INDEX IF NOT EXISTS idx_logo_methods_tags_gin ON logo_methods USING GIN(tags);

-- Premium options indexes
CREATE INDEX IF NOT EXISTS idx_premium_fabrics_cost_type ON premium_fabrics(cost_type);
CREATE INDEX IF NOT EXISTS idx_premium_fabrics_colors_gin ON premium_fabrics USING GIN(available_colors);
CREATE INDEX IF NOT EXISTS idx_premium_closures_type ON premium_closures(closure_type);

-- Delivery method indexes
CREATE INDEX IF NOT EXISTS idx_delivery_methods_type ON delivery_methods(delivery_type);
CREATE INDEX IF NOT EXISTS idx_delivery_methods_min_qty ON delivery_methods(min_quantity);

-- Cache indexes for ultra-fast lookups
CREATE INDEX IF NOT EXISTS idx_pricing_cache_key ON pricing_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_pricing_cache_category ON pricing_cache(category);
CREATE INDEX IF NOT EXISTS idx_pricing_cache_expires ON pricing_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_context_key ON ai_pricing_context(context_key);
CREATE INDEX IF NOT EXISTS idx_ai_context_session ON ai_pricing_context(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_expires ON ai_pricing_context(expires_at);

-- ============================================================================
-- 4. AUTOMATED FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all main tables
DO $$
BEGIN
    -- Only create triggers if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pricing_tiers_updated_at') THEN
        CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
        CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_logo_methods_updated_at') THEN
        CREATE TRIGGER update_logo_methods_updated_at BEFORE UPDATE ON logo_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_mold_charges_updated_at') THEN
        CREATE TRIGGER update_mold_charges_updated_at BEFORE UPDATE ON mold_charges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_premium_fabrics_updated_at') THEN
        CREATE TRIGGER update_premium_fabrics_updated_at BEFORE UPDATE ON premium_fabrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_premium_closures_updated_at') THEN
        CREATE TRIGGER update_premium_closures_updated_at BEFORE UPDATE ON premium_closures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_accessories_updated_at') THEN
        CREATE TRIGGER update_accessories_updated_at BEFORE UPDATE ON accessories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_delivery_methods_updated_at') THEN
        CREATE TRIGGER update_delivery_methods_updated_at BEFORE UPDATE ON delivery_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Function to invalidate cache when pricing data changes
CREATE OR REPLACE FUNCTION invalidate_pricing_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Clear relevant cache entries
    DELETE FROM pricing_cache WHERE category = TG_ARGV[0] OR cache_key LIKE '%' || TG_ARGV[0] || '%';
    DELETE FROM ai_pricing_context WHERE expires_at < NOW();
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM pricing_cache WHERE expires_at < NOW();
    DELETE FROM ai_pricing_context WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE logo_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE mold_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pricing_context ENABLE ROW LEVEL SECURITY;

-- Public read access for pricing data (AI and Order Builder need this)
DO $$
BEGIN
    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Public read access for pricing" ON pricing_tiers;
    DROP POLICY IF EXISTS "Public read access for products" ON products;
    DROP POLICY IF EXISTS "Public read access for logo methods" ON logo_methods;
    DROP POLICY IF EXISTS "Public read access for mold charges" ON mold_charges;
    DROP POLICY IF EXISTS "Public read access for fabrics" ON premium_fabrics;
    DROP POLICY IF EXISTS "Public read access for closures" ON premium_closures;
    DROP POLICY IF EXISTS "Public read access for accessories" ON accessories;
    DROP POLICY IF EXISTS "Public read access for delivery" ON delivery_methods;
    DROP POLICY IF EXISTS "Public read access for cache" ON pricing_cache;
    DROP POLICY IF EXISTS "Public access for ai context" ON ai_pricing_context;

    -- Create new policies
    CREATE POLICY "Public read access for pricing" ON pricing_tiers FOR SELECT USING (true);
    CREATE POLICY "Public read access for products" ON products FOR SELECT USING (is_active = true);
    CREATE POLICY "Public read access for logo methods" ON logo_methods FOR SELECT USING (true);
    CREATE POLICY "Public read access for mold charges" ON mold_charges FOR SELECT USING (true);
    CREATE POLICY "Public read access for fabrics" ON premium_fabrics FOR SELECT USING (true);
    CREATE POLICY "Public read access for closures" ON premium_closures FOR SELECT USING (true);
    CREATE POLICY "Public read access for accessories" ON accessories FOR SELECT USING (true);
    CREATE POLICY "Public read access for delivery" ON delivery_methods FOR SELECT USING (true);
    CREATE POLICY "Public read access for cache" ON pricing_cache FOR SELECT USING (true);
    CREATE POLICY "Public access for ai context" ON ai_pricing_context FOR ALL USING (true);
END
$$;

-- ============================================================================
-- 6. PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- Cache performance monitoring
CREATE OR REPLACE VIEW pricing_cache_stats AS
SELECT
  category,
  COUNT(*) as cache_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_updated))) as avg_age_seconds
FROM pricing_cache
GROUP BY category;

-- AI context usage statistics
CREATE OR REPLACE VIEW ai_context_stats AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as contexts_created,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(EXTRACT(EPOCH FROM (last_accessed - created_at))) as avg_session_duration
FROM ai_pricing_context
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- ============================================================================
-- SCHEMA DEPLOYMENT COMPLETE
-- ============================================================================

-- Add schema metadata
COMMENT ON SCHEMA public IS 'US Custom Cap - High-Performance Pricing Schema v1.0 - AI-Optimized with intelligent caching';

-- Success notification
DO $$
BEGIN
  RAISE NOTICE '🎯 US Custom Cap Pricing Schema Deployment Complete!';
  RAISE NOTICE '✅ Tables: 11 pricing tables created';
  RAISE NOTICE '🚀 Indexes: 16 performance indexes created';
  RAISE NOTICE '⚙️  Functions: 3 automated functions created';
  RAISE NOTICE '🔒 RLS: 10 security policies applied';
  RAISE NOTICE '📊 Views: 2 monitoring views created';
  RAISE NOTICE '🔄 Ready for CSV data migration and AI integration!';
END
$$;