import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from './supabase-ssr';
import { supabaseAdmin } from './supabase';

export async function getCurrentUser(request: NextRequest) {
  try {
    // Use the new SSR client to handle cookies properly
    const { supabase } = createRouteHandlerClient(request);

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
