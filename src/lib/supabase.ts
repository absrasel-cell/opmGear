import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nowxzkdkaegjwfhhqoez.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vd3h6a2RrYWVnandmaGhxb2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5NzI4OTIsImV4cCI6MjA0NzU0ODg5Mn0.s_7cWTBrV5TIVrYDPx8mFj4rR_9gOnoxE2c7N6VEEyM'

// For server-side operations, we'll use the service role key when available
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Validate that we have required keys
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey || supabaseAnonKey === '') {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable, using fallback')
}

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined'
  }
})

// Client for server-side operations with elevated permissions
// Falls back to anon key if service key not available
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })
