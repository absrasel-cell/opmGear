CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE IF NOT EXISTS mold_charges (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            size VARCHAR(20) NOT NULL UNIQUE,
            size_example VARCHAR(30),
            charge_amount DECIMAL(8,2) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

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

CREATE TABLE IF NOT EXISTS pricing_cache (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            cache_key VARCHAR(200) NOT NULL UNIQUE,
            category VARCHAR(50) NOT NULL,
            pricing_data JSONB NOT NULL,
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

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