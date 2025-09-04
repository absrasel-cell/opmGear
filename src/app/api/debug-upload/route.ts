import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  console.log('Debug upload endpoint accessed');
  
  const debugInfo = {
   timestamp: new Date().toISOString(),
   environment: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
   },
   supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'FALLBACK_URL',
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
   }
  };
  
  // Test Supabase connection
  try {
   const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
   debugInfo.storage = {
    accessible: !bucketsError,
    error: bucketsError?.message || null,
    buckets: buckets?.map(b => b.name) || [],
    uploadsBucketExists: buckets?.some(b => b.name === 'uploads') || false
   };
  } catch (storageError) {
   debugInfo.storage = {
    accessible: false,
    error: storageError instanceof Error ? storageError.message : 'Unknown error',
    buckets: [],
    uploadsBucketExists: false
   };
  }
  
  // Test authentication
  try {
   const user = await getCurrentUser(request);
   debugInfo.auth = {
    userFound: !!user,
    userId: user?.id || null,
    userEmail: user?.email || null
   };
  } catch (authError) {
   debugInfo.auth = {
    userFound: false,
    error: authError instanceof Error ? authError.message : 'Unknown error',
    userId: null,
    userEmail: null
   };
  }
  
  console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
  
  return NextResponse.json({
   success: true,
   message: 'Debug information collected',
   debug: debugInfo
  });
 } catch (error) {
  console.error('Debug endpoint error:', error);
  return NextResponse.json({ 
   error: 'Debug failed',
   details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
 }
}
