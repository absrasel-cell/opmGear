import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import prisma from './prisma';

export async function getCurrentUser(request: NextRequest) {
  try {
    // Try to get token from request headers first
    const authHeader = request.headers.get('authorization');
    let accessToken = authHeader?.replace('Bearer ', '');
    
    // If not in headers, try cookies
    if (!accessToken) {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      console.log('Available cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));
      
      accessToken = cookieStore.get('sb-access-token')?.value;
      
      // Also try other common Supabase cookie names
      if (!accessToken) {
        accessToken = cookieStore.get('supabase-auth-token')?.value;
      }
      if (!accessToken) {
        accessToken = cookieStore.get('supabase.auth.token')?.value;
      }
    }

    if (!accessToken) {
      console.log('No access token found in any location');
      return null;
    }

    console.log('Access token found, length:', accessToken.length);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Supabase auth error:', error);
      return null;
    }
    
    console.log('User authenticated successfully:', user?.id);
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function getUserProfile(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        accessRole: true,
        customerRole: true,
        adminLevel: true,
        phone: true,
        company: true,
        avatarUrl: true,
        isBanned: true,
        lastLoginAt: true,
      },
    });
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
  
  const isMasterAdmin = profile?.email === 'absrasel@gmail.com' || profile?.email === 'vic@onpointmarketing.com';
  if (!profile || (profile.accessRole !== 'SUPER_ADMIN' && profile.accessRole !== 'MASTER_ADMIN' && !isMasterAdmin)) {
    throw new Error('Forbidden: Admin access required');
  }
  
  return { user, profile };
}
