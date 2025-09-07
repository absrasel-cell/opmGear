import { createBrowserClient, createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tfiemrpfsvxvzgbqisdp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmaWVtcnBmc3Z4dnpnYnFpc2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODE1ODksImV4cCI6MjA3MTc1NzU4OX0.15QtT5Ueh_IVh3Mwa_EC9lR0yMzR0j2y8VEI-CGOHNs'

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Client-side Supabase client
export function createClientComponentClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Server-side Supabase client for Server Components
export async function createServerComponentClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

// Server-side Supabase client for API routes
export function createRouteHandlerClient(request: Request) {
  const response = new Response()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieStore = new Map()
        
        // Parse cookies from the request
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const cookies = cookieHeader.split(';').map(cookie => cookie.trim())
          for (const cookie of cookies) {
            const [name, ...rest] = cookie.split('=')
            const value = rest.join('=')
            if (name && value) {
              cookieStore.set(name, value)
            }
          }
        }

        return Array.from(cookieStore.entries()).map(([name, value]) => ({
          name,
          value
        }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  return { supabase, response }
}

// Middleware Supabase client
export function createMiddlewareClient(request: Request) {
  const response = new Response()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieStore = new Map()
        
        // Parse cookies from the request
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const cookies = cookieHeader.split(';').map(cookie => cookie.trim())
          for (const cookie of cookies) {
            const [name, ...rest] = cookie.split('=')
            const value = rest.join('=')
            if (name && value) {
              cookieStore.set(name, value)
            }
          }
        }

        return Array.from(cookieStore.entries()).map(([name, value]) => ({
          name,
          value
        }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  return { supabase, response }
}