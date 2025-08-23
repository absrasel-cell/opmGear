# Supabase Setup Guide

## 🔧 Environment Variables Required

Please add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://nowxzkdkaegjwfhhqoez.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database (URL encoded password)
DATABASE_URL=postgresql://postgres:Fuckingshit34%26%40%24%24@db.nowxzkdkaegjwfhhqoez.supabase.co:5432/postgres

# Keep existing keys
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
WEBFLOW_API_KEY=9a63f10c0d483ab263de85c6147bb9d4f1e30ac960b2c577344bb8b31b90e9e7
WEBFLOW_COLLECTIONS_ENDPOINT=https://api.webflow.com/v2/collections
WEBFLOW_COLLECTION_ITEMS_ENDPOINT=https://api.webflow.com/v2/collections/{collection_id}/items
WEBFLOW_PRODUCTS_COLLECTION_ID=60b6a9b3d3e9c84f0d6e7a93
WEBFLOW_PRICING_COLLECTION_ID=671e9e13b016c17c7c965302
WEBFLOW_PRODUCT_OPTIONS_COLLECTION_ID=671e9e13b016c17c7c9652fa
WEBFLOW_GET_IMAGE_ENDPOINT=https://api.webflow.com/v2/assets/{asset_id}
SANITY_API_TOKEN=your_sanity_token_here
```

## 📝 Password Encoding Note

Your original password `Fuckingshit34&@$$` contains special characters that must be URL encoded:
- `&` becomes `%26`
- `@` becomes `%40`
- `$` becomes `%24`

Result: `Fuckingshit34%26%40%24%24`

## 🔑 Where to Find Your Keys

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy:
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## 🛡️ Security Setup

We'll use:
- **Supabase Auth** for user authentication (replacing JWT)
- **Row Level Security (RLS)** for data protection
- **Supabase Storage** for file uploads
- **Realtime** for live message updates

## 📊 Database Migration Plan

1. **Users**: Managed by Supabase Auth + custom profile data
2. **Orders**: Store customization data with user references
3. **Messages**: Real-time messaging with read receipts
4. **Quotes**: Quote request management
5. **File Storage**: Images and attachments in Supabase Storage

## ⚠️ Important Notes

- All user passwords will be managed by Supabase Auth
- Existing MongoDB data will NOT be migrated (fresh start)
- File uploads will move to Supabase Storage
- Real-time subscriptions for messages
