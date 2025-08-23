import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, company } = await request.json();
    console.log('Registration attempt for:', email, 'name:', name);

    // Validate input
    if (!email || !password || !name) {
      console.log('Missing required fields:', { email: !!email, password: !!password, name: !!name });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sign up with Supabase Auth
    console.log('Attempting Supabase signup...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    console.log('Supabase signup result:', { data: !!data, error: !!error, userId: data?.user?.id });

    if (error) {
      console.error('Supabase auth error:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'email_provider_disabled') {
        return NextResponse.json(
          { error: 'Email registration is currently disabled. Please contact support.' },
          { status: 400 }
        );
      } else if (error.message.includes('Password should be at least')) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long.' },
          { status: 400 }
        );
      } else if (error.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    if (data.user) {
      // Create user profile in our database
      try {
        await prisma.user.create({
          data: {
            id: data.user.id,
            email: data.user.email!,
            name,
            phone: phone || null,
            company: company || null,
            role: 'CUSTOMER', // Will be updated by intake API if needed
          },
        });
      } catch (dbError) {
        console.error('Database error creating user profile:', dbError);
        // Continue anyway - user is created in Supabase
      }

      // For now, treat all registrations as confirmed (email confirmation disabled)
      return NextResponse.json(
        { 
          message: 'User created successfully',
          user: {
            id: data.user.id,
            email: data.user.email,
            name,
          }
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}