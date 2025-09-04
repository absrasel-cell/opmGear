import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
 try {
  console.log('Users API: Starting request...');
  
  const supabaseUser = await getCurrentUser(request);
  console.log('Users API: Supabase user:', supabaseUser ? { id: supabaseUser.id, email: supabaseUser.email } : 'null');
  
  if (!supabaseUser) {
   return NextResponse.json({ error: 'Unauthorized - No user found' }, { status: 401 });
  }

  // Get user profile from Prisma to check role
  console.log('Users API: Getting user profile...');
  const userProfile = await getUserProfile(supabaseUser.id);
  console.log('Users API: User profile:', userProfile);
  
  if (!userProfile) {
   return NextResponse.json({ error: 'Unauthorized - User profile not found' }, { status: 401 });
  }

  // Check if user is admin or master admin
  const isMasterAdmin = userProfile.email === 'absrasel@gmail.com' || userProfile.email === 'vic@onpointmarketing.com';
  const isAdmin = userProfile.accessRole === 'SUPER_ADMIN' || 
          userProfile.accessRole === 'MASTER_ADMIN' || 
          userProfile.customerRole === 'ADMIN' ||
          isMasterAdmin;
  
  console.log('Users API: Authorization check:', {
   email: userProfile.email,
   accessRole: userProfile.accessRole,
   customerRole: userProfile.customerRole,
   isMasterAdmin,
   isAdmin
  });
  
  if (!isAdmin) {
   return NextResponse.json({ 
    error: 'Forbidden - Admin access required',
    details: {
     email: userProfile.email,
     accessRole: userProfile.accessRole,
     customerRole: userProfile.customerRole
    }
   }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  console.log('Users API: Query params - limit:', limit, 'offset:', offset);

  try {
   console.log('Users API: Starting database query...');
   const users = await prisma.user.findMany({
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
     createdAt: true,
     updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
   });
   console.log('Users API: Users fetched successfully:', users.length);

   console.log('Users API: Getting total count...');
   const totalCount = await prisma.user.count();
   console.log('Users API: Total count:', totalCount);

   // Transform users to match the expected structure
   const transformedUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name || 'Unknown User',
    accessRole: user.accessRole,
    customerRole: user.customerRole,
    adminLevel: user.adminLevel,
    phone: user.phone,
    company: user.company,
    avatarUrl: user.avatarUrl,
    isBanned: user.isBanned || false,
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
   }));

   return NextResponse.json({
    users: transformedUsers,
    totalCount,
    hasMore: offset + limit < totalCount,
   });
  } catch (dbError) {
   console.error('Database error when fetching users:', dbError);
   
   // Return empty users list when database is unavailable
   return NextResponse.json({
    users: [],
    totalCount: 0,
    hasMore: false,
    note: 'Users temporarily unavailable due to database maintenance.',
   }, { status: 200 });
  }
 } catch (error) {
  console.error('Error fetching users:', error);
  return NextResponse.json(
   { error: 'Failed to fetch users' },
   { status: 500 }
  );
 }
}

export async function PATCH(request: NextRequest) {
 try {
  const supabaseUser = await getCurrentUser(request);
  if (!supabaseUser) {
   return NextResponse.json({ error: 'Unauthorized - No user found' }, { status: 401 });
  }

  // Get user profile from Prisma to check role
  const userProfile = await getUserProfile(supabaseUser.id);
  if (!userProfile) {
   return NextResponse.json({ error: 'Unauthorized - User profile not found' }, { status: 401 });
  }

  // Check if user is admin or master admin
  const isMasterAdmin = userProfile.email === 'absrasel@gmail.com' || userProfile.email === 'vic@onpointmarketing.com';
  if (userProfile.accessRole !== 'SUPER_ADMIN' && userProfile.accessRole !== 'MASTER_ADMIN' && !isMasterAdmin) {
   return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  const { userId, updates } = await request.json();

  if (!userId || !updates) {
   return NextResponse.json(
    { error: 'User ID and updates are required' },
    { status: 400 }
   );
  }

  // Update user
  const updatedUser = await prisma.user.update({
   where: { id: userId },
   data: updates,
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
    createdAt: true,
    updatedAt: true,
   },
  });

  return NextResponse.json({
   message: 'User updated successfully',
   user: updatedUser,
  });
 } catch (error) {
  console.error('Error updating user:', error);
  return NextResponse.json(
   { error: 'Failed to update user' },
   { status: 500 }
  );
 }
}


