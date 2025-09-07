import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_request: NextRequest) {
 try {
  const cookieStore = await cookies();
  // Try the correct Supabase cookie name first
  let accessToken = cookieStore.get('sb-nowxzkdkaegjwfhhqoez-auth-token')?.value;
  
  // Fallback to the shorter name if not found
  if (!accessToken) {
    accessToken = cookieStore.get('sb-access-token')?.value;
  }

  if (!accessToken) {
   return NextResponse.json({ user: null }, { status: 200 });
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

  // Create a Supabase client with the access token
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

  if (error || !user) {
   return NextResponse.json({ user: null }, { status: 200 });
  }

  // Get additional user data from our database
  let userData = null;
  try {
   const { data: existingUser, error: fetchError } = await supabaseAdmin
    .from('User')
    .select('id, email, name, accessRole, customerRole, adminLevel, phone, company, avatarUrl')
    .eq('id', user.id)
    .single();

   if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
   }

   userData = existingUser;

   // If user doesn't exist in database, create them
   if (!userData) {
    console.log('Creating user in database during session check:', user.id);
    try {
     // Check if this is the master admin email
     const isMasterAdmin = user.email === 'absrasel@gmail.com';
     
     const { data: newUser, error: createError } = await supabaseAdmin
      .from('User')
      .insert({
       id: user.id,
       email: user.email!,
       name: user.user_metadata?.name || null,
       accessRole: isMasterAdmin ? 'MASTER_ADMIN' : 'CUSTOMER',
       customerRole: 'RETAIL',
       adminLevel: isMasterAdmin ? 'MASTER' : null,
      })
      .select('id, email, name, accessRole, customerRole, adminLevel, phone, company, avatarUrl')
      .single();

     if (createError) {
      throw createError;
     }

     userData = newUser;
     console.log('User created successfully in database during session check');
    } catch (createError) {
     console.error('Failed to create user in database during session check:', createError);
     // Continue with fallback user data
    }
   }
  } catch (dbError) {
   console.error('Database connection failed during session check:', dbError);
   // Continue with fallback user data from Supabase Auth
  }

  // Always return user data from Supabase Auth
  // Database operations are optional and won't break the session
  const userResponse = userData || {
   id: user.id,
   email: user.email,
   name: user.user_metadata?.name || null,
   accessRole: 'CUSTOMER',
   customerRole: 'RETAIL',
  };

  console.log('Session check successful, returning user:', userResponse);

  return NextResponse.json({
   user: userResponse,
  });
 } catch (error) {
  console.error('Session error:', error);
  return NextResponse.json({ user: null }, { status: 200 });
 }
}