import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
 try {
  console.log('Login attempt received');
  const { email, password } = await request.json();
  console.log('Email provided:', email);

  // Validate input
  if (!email || !password) {
   console.log('Missing credentials');
   return NextResponse.json(
    { error: 'Email and password are required' },
    { status: 400 }
   );
  }

  console.log('Attempting login for:', email);
  
  console.log('Attempting Supabase auth...');
  
  // Sign in with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
   email,
   password,
  });

  if (error) {
   console.error('Supabase login error:', error.message);
   
   // Provide more user-friendly error messages
   let userMessage = 'Login failed';
   if (error.message.includes('Invalid login credentials')) {
    userMessage = 'Invalid email or password. Please check your credentials and try again.';
   } else if (error.message.includes('Email not confirmed')) {
    userMessage = 'Please check your email and confirm your account before logging in.';
   } else if (error.message.includes('Too many requests')) {
    userMessage = 'Too many login attempts. Please wait a moment before trying again.';
   } else {
    userMessage = error.message;
   }
   
   return NextResponse.json(
    { error: userMessage },
    { status: 401 }
   );
  }

  if (!data?.user || !data?.session) {
   console.error('Supabase auth succeeded but no user/session:', data);
   return NextResponse.json(
    { error: 'Authentication succeeded but session creation failed' },
    { status: 500 }
   );
  }

  console.log('Supabase auth successful:', {
   userId: data.user.id,
   hasSession: !!data.session
  });

  if (data.user && data.session) {
   // Set session cookies for server-side auth
   const cookieStore = await cookies();
   
   // Set access token cookie
   cookieStore.set('sb-access-token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
   });

   // Set refresh token cookie
   cookieStore.set('sb-refresh-token', data.session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
   });

   console.log('Fetching user data for ID:', data.user.id);
   
   // Get complete user data from our database
   let userData = null;
   try {
    const { data: existingUser, error: fetchError } = await supabaseAdmin
     .from('User')
     .select('id, email, name, accessRole, customerRole, adminLevel, phone, company, avatarUrl')
     .eq('id', data.user.id)
     .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
     console.error('Error fetching user:', fetchError);
    } else if (existingUser) {
     userData = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      role: existingUser.accessRole, // Map accessRole to role for compatibility
      adminLevel: existingUser.adminLevel,
      phone: existingUser.phone,
      company: existingUser.company,
      avatarUrl: existingUser.avatarUrl,
     };
    }

    console.log('User data found:', !!userData);

    // If user doesn't exist in database, create them
    if (!userData) {
     console.log('Creating user in database:', data.user.id);
     try {
      const { data: newUser, error: createError } = await supabaseAdmin
       .from('User')
       .insert({
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.name || null,
        accessRole: 'CUSTOMER',
        customerRole: 'RETAIL',
       })
       .select('id, email, name, accessRole, customerRole, adminLevel, phone, company, avatarUrl')
       .single();

      if (createError) {
       console.error('Failed to create user in database:', createError);
      } else if (newUser) {
       userData = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.accessRole,
        adminLevel: newUser.adminLevel,
        phone: newUser.phone,
        company: newUser.company,
        avatarUrl: newUser.avatarUrl,
       };
       console.log('User created successfully in database');
      }
     } catch (createError) {
      console.error('Failed to create user in database:', createError);
      // Continue with fallback user data
     }
    }
   } catch (dbError) {
    console.error('Database connection failed:', dbError);
    // Continue with fallback user data from Supabase Auth
   }

   // Always return success with user data from Supabase Auth
   // Database operations are optional and won't break the login
   const userResponse = userData || {
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.name || null,
    role: 'CUSTOMER',
   };

   console.log('Login successful, returning user:', userResponse);

   return NextResponse.json({
    message: 'Login successful',
    user: userResponse,
   });
  }

  return NextResponse.json(
   { error: 'Login failed' },
   { status: 401 }
  );
 } catch (error) {
  console.error('Login error:', error);
  // Return more detailed error information
  return NextResponse.json(
   { 
    error: 'Internal server error',
    details: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
   },
   { status: 500 }
  );
 }
}