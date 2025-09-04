import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  console.log('Testing Supabase storage access...');
  
  // Test if we can list the uploads bucket
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
   console.error('Error listing buckets:', bucketsError);
   return NextResponse.json({ 
    error: 'Failed to access storage',
    details: bucketsError.message 
   }, { status: 500 });
  }
  
  console.log('Available buckets:', buckets);
  
  // Check if uploads bucket exists
  const uploadsBucket = buckets.find(bucket => bucket.name === 'uploads');
  
  if (!uploadsBucket) {
   return NextResponse.json({ 
    error: 'Uploads bucket not found',
    availableBuckets: buckets.map(b => b.name)
   }, { status: 404 });
  }
  
  // Test listing files in uploads bucket
  const { data: files, error: filesError } = await supabase.storage
   .from('uploads')
   .list('messages', { limit: 10 });
  
  if (filesError) {
   console.error('Error listing files:', filesError);
   return NextResponse.json({ 
    error: 'Failed to list files in uploads bucket',
    details: filesError.message 
   }, { status: 500 });
  }
  
  return NextResponse.json({
   success: true,
   message: 'Storage is accessible',
   bucket: uploadsBucket,
   files: files
  });
  
 } catch (error) {
  console.error('Storage test error:', error);
  return NextResponse.json({ 
   error: 'Storage test failed',
   details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
 }
}
