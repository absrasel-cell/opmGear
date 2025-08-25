import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing authentication...');
    
    const supabaseUser = await getCurrentUser(request);
    console.log('Supabase user:', supabaseUser ? { id: supabaseUser.id, email: supabaseUser.email } : 'null');
    
    if (!supabaseUser) {
      return NextResponse.json({ 
        error: 'No Supabase user found',
        details: 'User not authenticated in Supabase'
      }, { status: 401 });
    }

    const userProfile = await getUserProfile(supabaseUser.id);
    console.log('User profile:', userProfile);
    
    if (!userProfile) {
      return NextResponse.json({ 
        error: 'No user profile found',
        details: 'User exists in Supabase but not in Prisma database',
        supabaseUser: { id: supabaseUser.id, email: supabaseUser.email }
      }, { status: 401 });
    }

    const isMasterAdmin = userProfile.email === 'absrasel@gmail.com' || userProfile.email === 'vic@onpointmarketing.com';
    const isAdmin = userProfile.role === 'ADMIN' || isMasterAdmin;

    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        isAdmin,
        isMasterAdmin
      },
      message: isAdmin ? 'User has admin access' : 'User does not have admin access'
    });

  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json({ 
      error: 'Authentication test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
