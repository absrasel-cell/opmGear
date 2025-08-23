import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const supabaseUser = await getCurrentUser(request);
    if (!supabaseUser) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 });
    }

    console.log('Fixing admin role for user:', supabaseUser.email);

    // Check if user exists in database
    let userProfile = await getUserProfile(supabaseUser.id);
    
    if (!userProfile) {
      // Create user if they don't exist
      console.log('Creating user in database...');
      userProfile = await prisma.user.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.name || null,
          role: 'ADMIN', // Set as admin for testing
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          adminLevel: true,
          phone: true,
          company: true,
          avatarUrl: true,
        },
      });
      console.log('User created with admin role');
    } else {
      // Update existing user to admin role
      console.log('Updating user role to admin...');
      userProfile = await prisma.user.update({
        where: { id: supabaseUser.id },
        data: { role: 'ADMIN' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          adminLevel: true,
          phone: true,
          company: true,
          avatarUrl: true,
        },
      });
      console.log('User role updated to admin');
    }

    return NextResponse.json({
      success: true,
      message: 'Admin role fixed successfully',
      user: userProfile
    });

  } catch (error) {
    console.error('Error fixing admin role:', error);
    return NextResponse.json({ 
      error: 'Failed to fix admin role',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
