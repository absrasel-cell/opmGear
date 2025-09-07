import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
// Removed Prisma - migrated to Supabase

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

  const dbUser = await prisma.user.findUnique({
   where: { email: user.email },
   select: {
    id: true,
    email: true,
    name: true,
    phone: true,
    company: true,
    address: true,
    preferences: true,
    accessRole: true,
    customerRole: true
   }
  });

  if (!dbUser) {
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
    access: dbUser.accessRole,
    customer: dbUser.customerRole
   }
  };

  return NextResponse.json(profileData);

 } catch (error) {
  console.error('Profile loading error:', error);
  return NextResponse.json(
   { error: 'Failed to load profile' },
   { status: 500 }
  );
 }
}