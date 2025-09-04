import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('Syncing user for email:', email);

    // First, check if user exists in Supabase Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json(
        { error: 'Failed to fetch auth users' },
        { status: 500 }
      );
    }

    const authUser = authUsers.users.find(user => user.email === email);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'User not found in Supabase Auth' },
        { status: 404 }
      );
    }

    console.log('Found auth user:', authUser.id);

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { id: authUser.id }
    });

    if (existingUser) {
      return NextResponse.json({
        message: 'User already exists in database',
        user: existingUser
      });
    }

    // Create user in our database
    const newUser = await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.name || null,
        role: 'CUSTOMER',
        createdAt: new Date(authUser.created_at),
        updatedAt: new Date(authUser.updated_at || authUser.created_at),
      }
    });

    console.log('Created user in database:', newUser.id);

    return NextResponse.json({
      message: 'User synced successfully',
      user: newUser
    });

  } catch (error: any) {
    console.error('Sync user error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync user',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
