import { NextRequest } from 'next/server';
import { createRouteHandlerClient, createServerComponentClient } from './supabase-ssr';
import { supabaseAdmin } from './supabase';

export async function getCurrentUser(request: NextRequest) {
  try {
    // Use the same working pattern as /api/auth/session
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    
    // Try the correct Supabase cookie name first
    let accessToken = cookieStore.get('sb-nowxzkdkaegjwfhhqoez-auth-token')?.value;
    
    // Fallback to the shorter name if not found
    if (!accessToken) {
      accessToken = cookieStore.get('sb-access-token')?.value;
    }

    if (!accessToken) {
      console.log('No access token found in cookies');
      return null;
    }

    // Parse the access token from the JSON if it's stored as JSON
    let token = accessToken;
    try {
      const parsedToken = JSON.parse(accessToken);
      if (parsedToken.access_token) {
        token = parsedToken.access_token;
      }
    } catch (e) {
      // If it's not JSON, use as is
    }

    // Create a Supabase client with the access token (same as working session API)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('Supabase auth error:', error.message);
      return null;
    }
    
    if (user) {
      console.log('User authenticated successfully:', user.id);
      return user;
    }
    
    console.log('No authenticated user found');
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function getUserProfile(userId: string) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('User')
      .select('id, email, name, accessRole, customerRole, adminLevel, phone, company, avatarUrl, isBanned, lastLoginAt')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

export async function requireAuth(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(request: NextRequest) {
  const user = await requireAuth(request);
  const profile = await getUserProfile(user.id);
  
  const isMasterAdmin = profile?.email === 'absrasel@gmail.com';
  if (!profile || (profile.accessRole !== 'SUPER_ADMIN' && profile.accessRole !== 'MASTER_ADMIN' && !isMasterAdmin)) {
    throw new Error('Forbidden: Admin access required');
  }
  
  return { user, profile };
}
