# Supabase Pricing Schema Execution Guide

**Step 2 of Pricing Migration: Create Supabase pricing tables with proper relationships**

## 🎯 Objective
Execute the complete Supabase pricing schema to create 11 pricing tables, 16 indexes, 3 functions, 10 RLS policies, and 2 monitoring views - all optimized for ultra-fast AI performance and Order Builder integration.

## 📋 Files Generated

1. **`complete-supabase-pricing-schema.sql`** - Complete schema with all features
2. **`supabase-pricing-schema.sql`** - Core tables only (backup)
3. **`verify-pricing-schema.js`** - Verification script

## 🚀 Execution Options

### Option 1: Manual Execution (Recommended)

**Step 1: Access Supabase SQL Editor**
```
1. Go to: https://supabase.com/dashboard/project/tfiemrpfsvxvzgbqisdp/sql/new
2. Login with your Supabase credentials
3. Open the SQL Editor
```

**Step 2: Execute Schema**
```
1. Copy content from: complete-supabase-pricing-schema.sql
2. Paste into Supabase SQL Editor
3. Click "Run" to execute
4. Wait for completion (should show success notifications)
```

**Step 3: Verify Execution**
```bash
cd "F:\Custom Cap - github\USCC"
node verify-pricing-schema.js
```

### Option 2: Programmatic Execution (If Connection Issues Resolved)

```bash
cd "F:\Custom Cap - github\USCC"
node execute-schema-direct.js
```

## 📊 Schema Components

### Tables Created (11 total)
1. **`pricing_tiers`** - Tier 1, 2, 3 with volume pricing
2. **`products`** - Product catalog with tier references
3. **`logo_methods`** - Logo customization options
4. **`mold_charges`** - Logo mold charges
5. **`premium_fabrics`** - Fabric upgrade options
6. **`premium_closures`** - Closure upgrade options
7. **`accessories`** - Cap accessories
8. **`delivery_methods`** - Shipping options
9. **`pricing_cache`** - Performance cache
10. **`ai_pricing_context`** - AI optimization cache

### Performance Features
- **16 indexes** for ultra-fast queries
- **GIN indexes** for JSONB and array fields
- **Partial indexes** for active records only
- **Composite indexes** for complex lookups

### Automation Features
- **3 functions** for cache management and timestamps
- **8 triggers** for automatic updated_at timestamps
- **Cache invalidation** on pricing changes

### Security Features
- **RLS policies** for all tables
- **Public read access** for pricing data (AI/Order Builder)
- **Admin write access** for management
- **Service role access** for cache operations

## 🔍 Verification Checklist

After execution, verify:

✅ **Tables accessible**: All 11 tables respond to SELECT queries
✅ **Indexes created**: Performance indexes in place
✅ **Functions created**: 3 automation functions available
✅ **RLS policies**: Security policies applied
✅ **Insert/Update works**: Basic operations functional

## 🎯 Expected Results

### Success Indicators
```
🎯 US Custom Cap Pricing Schema Deployment Complete!
✅ Tables: 11 pricing tables created
🚀 Indexes: 16 performance indexes created
⚙️  Functions: 3 automated functions created
🔒 RLS: 10 security policies applied
📊 Views: 2 monitoring views created
🔄 Ready for CSV data migration and AI integration!
```

### Verification Output
```
🔍 Verifying Supabase Pricing Schema...
📋 Verifying table access...
✅ pricing_tiers: Accessible (0 rows)
✅ products: Accessible (0 rows)
... (all 11 tables)
🚀 PRICING SCHEMA VERIFICATION SUCCESSFUL!
```

## 🔄 Next Steps

After successful schema execution:

1. **Step 3**: CSV Data Migration
   - Import pricing tiers from CSV
   - Import product catalog
   - Import logo methods and options

2. **Step 4**: AI Integration Testing
   - Test caching performance
   - Verify AI context storage
   - Test Order Builder integration

3. **Step 5**: Admin Dashboard Integration
   - Connect pricing management UI
   - Test CRUD operations
   - Verify real-time updates

## 🐛 Troubleshooting

### Common Issues

**Connection Errors**
- Verify environment variables in `.env.local`
- Check Supabase project status
- Try manual execution via web interface

**Permission Errors**
- Ensure service role key is correct
- Check RLS policies are properly applied
- Verify table ownership

**SQL Errors**
- Check for conflicting table names
- Verify all dependencies exist
- Look for missing extensions

### Error Resolution

**If tables already exist:**
- Schema uses `IF NOT EXISTS` - should be safe
- Drop conflicting tables if needed
- Re-run schema execution

**If functions fail:**
- Check for existing function conflicts
- Manually drop and recreate functions
- Verify plpgsql extension enabled

## 📞 Support

If issues persist:
1. Check Supabase dashboard for error logs
2. Verify database connection in web interface
3. Test with minimal table creation first
4. Use manual SQL editor execution as fallback

---

**Status**: Ready for execution
**Priority**: High (Required for AI integration)
**Dependencies**: Supabase database access
**Next Step**: CSV data migration (Step 3)