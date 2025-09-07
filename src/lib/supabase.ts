import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tfiemrpfsvxvzgbqisdp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmaWVtcnBmc3Z4dnpnYnFpc2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODE1ODksImV4cCI6MjA3MTc1NzU4OX0.15QtT5Ueh_IVh3Mwa_EC9lR0yMzR0j2y8VEI-CGOHNs'

// For server-side operations, we'll use the service role key when available
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Validate that we have required keys
if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey || supabaseAnonKey === '') {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable, using fallback')
}

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined'
  }
})

// Client for server-side operations with elevated permissions
// Falls back to anon key if service key not available
if (supabaseServiceKey) {
  console.log('✅ Supabase Admin: Using service role key for elevated permissions')
} else {
  console.log('⚠️ Supabase Admin: Service role key not found, falling back to anon key')
}

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })
