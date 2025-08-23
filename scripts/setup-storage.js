const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  try {
    console.log('Setting up Supabase storage...');
    
    // List existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    console.log('Existing buckets:', existingBuckets.map(b => b.name));
    
    // Check if uploads bucket exists
    const uploadsBucket = existingBuckets.find(bucket => bucket.name === 'uploads');
    
    if (uploadsBucket) {
      console.log('✅ Uploads bucket already exists');
    } else {
      console.log('Creating uploads bucket...');
      
      // Create the uploads bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('uploads', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return;
      }
      
      console.log('✅ Uploads bucket created successfully');
    }
    
    // Set up storage policies
    console.log('Setting up storage policies...');
    
    // Policy to allow authenticated users to upload files
    const { error: uploadPolicyError } = await supabase.rpc('create_policy', {
      policy_name: 'Allow authenticated uploads',
      table_name: 'storage.objects',
      definition: `
        CREATE POLICY "Allow authenticated uploads" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'uploads')
      `
    });
    
    if (uploadPolicyError) {
      console.log('Upload policy setup note:', uploadPolicyError.message);
    }
    
    // Policy to allow public read access
    const { error: readPolicyError } = await supabase.rpc('create_policy', {
      policy_name: 'Allow public read access',
      table_name: 'storage.objects',
      definition: `
        CREATE POLICY "Allow public read access" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'uploads')
      `
    });
    
    if (readPolicyError) {
      console.log('Read policy setup note:', readPolicyError.message);
    }
    
    console.log('✅ Storage setup completed');
    console.log('\nNext steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Storage > Policies');
    console.log('3. Ensure the uploads bucket has appropriate policies');
    console.log('4. Test the upload functionality');
    
  } catch (error) {
    console.error('Setup error:', error);
  }
}

setupStorage();
