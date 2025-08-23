# Supabase Storage Setup Guide

## Issue
The image upload is failing with a 500 error, likely because the Supabase storage bucket is not properly configured.

## Manual Setup Steps

### 1. Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar

### 2. Create Storage Bucket
1. Click **"New bucket"**
2. Enter bucket name: `uploads`
3. Make it **public** (check the "Public bucket" option)
4. Click **"Create bucket"**

### 3. Configure Bucket Settings
1. Click on the `uploads` bucket
2. Go to **Settings** tab
3. Set **File size limit** to `10MB`
4. Add **Allowed MIME types**:
   - `image/jpeg`
   - `image/png`
   - `image/gif`
   - `image/webp`
   - `application/pdf`
   - `text/plain`

### 4. Set Up Storage Policies
1. Go to **Policies** tab
2. Click **"New Policy"**

#### Policy 1: Allow Authenticated Uploads
- **Policy name**: `Allow authenticated uploads`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads');
```

#### Policy 2: Allow Public Read Access
- **Policy name**: `Allow public read access`
- **Target roles**: `public`
- **Policy definition**:
```sql
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'uploads');
```

### 5. Test the Setup
1. Run the test endpoint: `/api/test-storage`
2. Check if it returns success
3. Try uploading an image in the admin panel

## Alternative: Automated Setup
If you have the service role key, you can run:
```bash
node scripts/setup-storage.js
```

## Environment Variables
Make sure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Troubleshooting
1. Check the browser console for detailed error messages
2. Check the server logs for upload errors
3. Verify the storage bucket exists and is public
4. Ensure storage policies are correctly configured
5. Test authentication with `/api/test-auth`
