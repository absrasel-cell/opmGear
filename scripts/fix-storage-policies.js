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

async function fixStoragePolicies() {
  try {
    console.log('Checking Supabase storage policies...');
    
    // List existing buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('Available buckets:', buckets.map(b => b.name));
    
    // Check if uploads bucket exists
    const uploadsBucket = buckets.find(bucket => bucket.name === 'uploads');
    
    if (!uploadsBucket) {
      console.error('❌ Uploads bucket not found');
      return;
    }
    
    console.log('✅ Uploads bucket found');
    
    // Check current policies
    console.log('\nChecking current storage policies...');
    
    // Test upload functionality
    console.log('\nTesting upload functionality...');
    
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'This is a test file to verify upload functionality';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(`test/${testFileName}`, testFile, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      console.log('\nThis suggests the storage policies need to be configured.');
      console.log('\nPlease follow these steps:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to Storage > Policies');
      console.log('3. For the "uploads" bucket, add these policies:');
      console.log('   - INSERT policy: Allow authenticated users to upload');
      console.log('   - SELECT policy: Allow public read access');
      console.log('4. Or run this SQL in the SQL editor:');
      console.log(`
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow public read access to uploaded files
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'uploads');
      `);
    } else {
      console.log('✅ Upload test successful');
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('uploads')
        .remove([`test/${testFileName}`]);
      
      if (deleteError) {
        console.log('Note: Could not clean up test file:', deleteError.message);
      } else {
        console.log('✅ Test file cleaned up');
      }
    }
    
  } catch (error) {
    console.error('Setup error:', error);
  }
}

fixStoragePolicies();
