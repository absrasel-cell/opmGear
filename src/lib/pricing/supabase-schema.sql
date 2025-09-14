-- ============================================================================
-- US Custom Cap - Supabase Pricing Schema Design
-- Optimized for AI Performance and Order Builder Integration
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PRODUCT CATALOG TABLES
-- ============================================================================

-- Product categories and tiers
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name VARCHAR(20) NOT NULL UNIQUE, -- 'Tier 1', 'Tier 2', 'Tier 3'
  description TEXT,

  -- Volume-based pricing (matches CSV structure)
  price_48 DECIMAL(8,2) NOT NULL,
  price_144 DECIMAL(8,2) NOT NULL,
  price_576 DECIMAL(8,2) NOT NULL,
  price_1152 DECIMAL(8,2) NOT NULL,
  price_2880 DECIMAL(8,2) NOT NULL,
  price_10000 DECIMAL(8,2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product catalog (from Customer Products.csv)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Product identification
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE, -- e.g., '5P_Urban_Classic_HFS'

  -- Specifications from CSV
  profile VARCHAR(20) NOT NULL, -- 'High', 'Mid', 'Low'
  bill_shape VARCHAR(30) NOT NULL, -- 'Flat', 'Slight Curved', 'Curved'
  panel_count INTEGER NOT NULL, -- 4, 5, 6, 7
  structure_type VARCHAR(50) NOT NULL, -- 'Structured with Mono Lining', etc.

  -- Pricing tier reference
  pricing_tier_id UUID NOT NULL REFERENCES pricing_tiers(id),

  -- Search optimization
  nick_names TEXT[], -- Array of searchable nicknames
  tags JSONB, -- Additional metadata for AI search

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. LOGO CUSTOMIZATION TABLES
-- ============================================================================

-- Logo methods and pricing (from Logo.csv)
CREATE TABLE logo_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Method details
  name VARCHAR(50) NOT NULL, -- '3D Embroidery', 'Flat Embroidery', etc.
  application VARCHAR(20) NOT NULL, -- 'Direct', 'Patch'
  size VARCHAR(20) NOT NULL, -- 'Small', 'Medium', 'Large'
  size_example VARCHAR(30), -- '2 x 1.5', '3 x 2', etc.

  -- Volume-based pricing
  price_48 DECIMAL(8,2) NOT NULL,
  price_144 DECIMAL(8,2) NOT NULL,
  price_576 DECIMAL(8,2) NOT NULL,
  price_1152 DECIMAL(8,2) NOT NULL,
  price_2880 DECIMAL(8,2) NOT NULL,
  price_10000 DECIMAL(8,2) NOT NULL,
  price_20000 DECIMAL(8,2) NOT NULL,

  -- Mold charges
  mold_charge_type VARCHAR(30), -- 'Small Mold Charge', 'Medium Mold Charge', etc.

  -- AI optimization
  tags JSONB, -- Method characteristics for AI matching

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(name, application, size)
);

-- Mold charges table (from Logo.csv)
CREATE TABLE mold_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  size VARCHAR(20) NOT NULL, -- 'Small', 'Medium', 'Large'
  size_example VARCHAR(30), -- '2 x 1.5', etc.
  charge_amount DECIMAL(8,2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(size)
);

-- ============================================================================
-- 3. PREMIUM OPTIONS TABLES
-- ============================================================================

-- Premium fabrics (from Fabric.csv)
CREATE TABLE premium_fabrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Fabric details
  name VARCHAR(50) NOT NULL UNIQUE,
  cost_type VARCHAR(20) NOT NULL, -- 'Free', 'Premium Fabric'
  color_note TEXT, -- Available colors

  -- Volume-based pricing (0 for free fabrics)
  price_48 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_144 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_576 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_1152 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_2880 DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_10000 DECIMAL(8,2) NOT NULL DEFAULT 0,

  -- AI optimization
  available_colors TEXT[],
  tags JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Premium closures (from Closure.csv)
CREATE TABLE premium_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Closure details
  name VARCHAR(50) NOT NULL UNIQUE,
  closure_type VARCHAR(20) NOT NULL, -- 'Free', 'Premium Closure'

  -- Volume-based pricing
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

-- Accessories (from Accessories.csv)
CREATE TABLE accessories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Accessory details
  name VARCHAR(50) NOT NULL UNIQUE,

  -- Volume-based pricing
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

-- ============================================================================
-- 4. DELIVERY OPTIONS TABLE
-- ============================================================================

-- Delivery methods (from Delivery.csv)
CREATE TABLE delivery_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Delivery details
  name VARCHAR(50) NOT NULL UNIQUE,
  delivery_type VARCHAR(20) NOT NULL, -- 'Express', 'Freight'
  delivery_days VARCHAR(20) NOT NULL, -- '6-10 days', '15-30 days', etc.

  -- Volume-based pricing (NULL for not applicable)
  price_48 DECIMAL(8,2),
  price_144 DECIMAL(8,2),
  price_576 DECIMAL(8,2),
  price_1152 DECIMAL(8,2),
  price_2880 DECIMAL(8,2),
  price_10000 DECIMAL(8,2),
  price_20000 DECIMAL(8,2),

  -- Minimum quantity requirements
  min_quantity INTEGER DEFAULT 48,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. PRICING CACHE AND OPTIMIZATION TABLES
-- ============================================================================

-- Pricing cache for ultra-fast lookups
CREATE TABLE pricing_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Cache key components
  cache_key VARCHAR(200) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- 'product', 'logo', 'fabric', 'closure', 'accessory', 'delivery'

  -- Cached pricing data
  pricing_data JSONB NOT NULL,

  -- Cache metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI context and recommendations cache
CREATE TABLE ai_pricing_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Context identification
  context_key VARCHAR(200) NOT NULL UNIQUE,
  session_id VARCHAR(100),

  -- AI-optimized data
  recommended_products JSONB,
  cost_estimates JSONB,
  optimization_suggestions JSONB,

  -- Context metadata
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. INDEXES FOR ULTRA-FAST PERFORMANCE
-- ============================================================================

-- Product search indexes
CREATE INDEX idx_products_pricing_tier ON products(pricing_tier_id);
CREATE INDEX idx_products_panel_count ON products(panel_count);
CREATE INDEX idx_products_structure ON products(structure_type);
CREATE INDEX idx_products_nick_names_gin ON products USING GIN(nick_names);
CREATE INDEX idx_products_tags_gin ON products USING GIN(tags);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;

-- Logo method indexes
CREATE INDEX idx_logo_methods_lookup ON logo_methods(name, application, size);
CREATE INDEX idx_logo_methods_name ON logo_methods(name);
CREATE INDEX idx_logo_methods_tags_gin ON logo_methods USING GIN(tags);

-- Premium options indexes
CREATE INDEX idx_premium_fabrics_cost_type ON premium_fabrics(cost_type);
CREATE INDEX idx_premium_fabrics_colors_gin ON premium_fabrics USING GIN(available_colors);
CREATE INDEX idx_premium_closures_type ON premium_closures(closure_type);

-- Delivery method indexes
CREATE INDEX idx_delivery_methods_type ON delivery_methods(delivery_type);
CREATE INDEX idx_delivery_methods_min_qty ON delivery_methods(min_quantity);

-- Cache indexes for ultra-fast lookups
CREATE INDEX idx_pricing_cache_key ON pricing_cache(cache_key);
CREATE INDEX idx_pricing_cache_category ON pricing_cache(category);
CREATE INDEX idx_pricing_cache_expires ON pricing_cache(expires_at);
CREATE INDEX idx_ai_context_key ON ai_pricing_context(context_key);
CREATE INDEX idx_ai_context_session ON ai_pricing_context(session_id);
CREATE INDEX idx_ai_context_expires ON ai_pricing_context(expires_at);

-- ============================================================================
-- 7. AUTOMATED FUNCTIONS AND TRIGGERS
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
CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_logo_methods_updated_at BEFORE UPDATE ON logo_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mold_charges_updated_at BEFORE UPDATE ON mold_charges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_premium_fabrics_updated_at BEFORE UPDATE ON premium_fabrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_premium_closures_updated_at BEFORE UPDATE ON premium_closures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accessories_updated_at BEFORE UPDATE ON accessories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_methods_updated_at BEFORE UPDATE ON delivery_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Cache invalidation triggers
CREATE TRIGGER invalidate_product_cache AFTER INSERT OR UPDATE OR DELETE ON pricing_tiers FOR EACH STATEMENT EXECUTE FUNCTION invalidate_pricing_cache('product');
CREATE TRIGGER invalidate_logo_cache AFTER INSERT OR UPDATE OR DELETE ON logo_methods FOR EACH STATEMENT EXECUTE FUNCTION invalidate_pricing_cache('logo');
CREATE TRIGGER invalidate_fabric_cache AFTER INSERT OR UPDATE OR DELETE ON premium_fabrics FOR EACH STATEMENT EXECUTE FUNCTION invalidate_pricing_cache('fabric');
CREATE TRIGGER invalidate_closure_cache AFTER INSERT OR UPDATE OR DELETE ON premium_closures FOR EACH STATEMENT EXECUTE FUNCTION invalidate_pricing_cache('closure');
CREATE TRIGGER invalidate_accessory_cache AFTER INSERT OR UPDATE OR DELETE ON accessories FOR EACH STATEMENT EXECUTE FUNCTION invalidate_pricing_cache('accessory');
CREATE TRIGGER invalidate_delivery_cache AFTER INSERT OR UPDATE OR DELETE ON delivery_methods FOR EACH STATEMENT EXECUTE FUNCTION invalidate_pricing_cache('delivery');

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM pricing_cache WHERE expires_at < NOW();
    DELETE FROM ai_pricing_context WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Admin write access (for pricing management dashboard)
CREATE POLICY "Admin write access" ON pricing_tiers FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');
CREATE POLICY "Admin write products" ON products FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');
CREATE POLICY "Admin write logo methods" ON logo_methods FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');
CREATE POLICY "Admin write mold charges" ON mold_charges FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');
CREATE POLICY "Admin write fabrics" ON premium_fabrics FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');
CREATE POLICY "Admin write closures" ON premium_closures FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');
CREATE POLICY "Admin write accessories" ON accessories FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');
CREATE POLICY "Admin write delivery" ON delivery_methods FOR ALL USING (auth.jwt() ->> 'role' = 'ADMIN');

-- Service role access for cache management
CREATE POLICY "Service cache write" ON pricing_cache FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 9. PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- Cache performance monitoring
CREATE VIEW pricing_cache_stats AS
SELECT
  category,
  COUNT(*) as cache_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_updated))) as avg_age_seconds
FROM pricing_cache
GROUP BY category;

-- AI context usage statistics
CREATE VIEW ai_context_stats AS
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
-- SCHEMA COMPLETE - Ready for data migration and caching service
-- ============================================================================

COMMENT ON SCHEMA public IS 'US Custom Cap - High-Performance Pricing Schema v1.0 - Optimized for AI and Order Builder integration with intelligent caching';