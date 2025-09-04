import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET(_request: NextRequest) {
 try {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) {
   return NextResponse.json({ user: null }, { status: 200 });
  }

  // Create a Supabase client with the access token
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

  // Get user from Supabase
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
   return NextResponse.json({ user: null }, { status: 200 });
  }

  // Get additional user data from our database
  let userData = null;
  try {
   userData = await prisma.user.findUnique({
    where: { id: user.id },
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
    },
   });

   // If user doesn't exist in database, create them
   if (!userData) {
    console.log('Creating user in database during session check:', user.id);
    try {
     userData = await prisma.user.create({
      data: {
       id: user.id,
       email: user.email!,
       name: user.user_metadata?.name || null,
       accessRole: 'CUSTOMER',
       customerRole: 'RETAIL',
      },
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
      },
     });
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