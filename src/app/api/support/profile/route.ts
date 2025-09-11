import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
   return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
   );
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user?.email) {
   return NextResponse.json(
    { error: 'Invalid authentication' },
    { status: 401 }
   );
  }

  // Query Supabase users table
  const { data: dbUser, error: dbError } = await supabaseAdmin
   .from('users')
   .select('id, email, name, phone, company, address, preferences, access_role, customer_role')
   .eq('email', user.email)
   .single();

  if (dbError || !dbUser) {
   console.error('Database error:', dbError);
   return NextResponse.json(
    { error: 'User not found' },
    { status: 404 }
   );
  }

  // Format the response with safe data extraction
  const profileData = {
   id: dbUser.id,
   name: dbUser.name,
   email: dbUser.email,
   phone: dbUser.phone,
   company: dbUser.company,
   address: dbUser.address,
   preferences: dbUser.preferences,
   roles: {
    access: dbUser.access_role,
    customer: dbUser.customer_role
   }
  };

  return NextResponse.json({ profile: profileData });

 } catch (error) {
  console.error('Profile loading error:', error);
  return NextResponse.json(
   { error: 'Failed to load profile' },
   { status: 500 }
  );
 }
}