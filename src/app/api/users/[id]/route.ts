import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function DELETE(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
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
  if (userProfile.role !== 'ADMIN' && !isMasterAdmin) {
   return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  const userId = params.id;

  if (!userId) {
   return NextResponse.json(
    { error: 'User ID is required' },
    { status: 400 }
   );
  }

  // Prevent deleting the current user
  if (userId === supabaseUser.id) {
   return NextResponse.json(
    { error: 'Cannot delete your own account' },
    { status: 400 }
   );
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
   where: { id: userId },
  });

  if (!existingUser) {
   return NextResponse.json(
    { error: 'User not found' },
    { status: 404 }
   );
  }

  // Delete user
  await prisma.user.delete({
   where: { id: userId },
  });

  return NextResponse.json({
   message: 'User deleted successfully',
  });
 } catch (error) {
  console.error('Error deleting user:', error);
  return NextResponse.json(
   { error: 'Failed to delete user' },
   { status: 500 }
  );
 }
}

export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
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
  if (userProfile.role !== 'ADMIN' && !isMasterAdmin) {
   return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  const userId = params.id;

  const userData = await prisma.user.findUnique({
   where: { id: userId },
   select: {
    id: true,
    email: true,
    name: true,
    role: true,
    adminLevel: true,
    phone: true,
    company: true,
    avatarUrl: true,
    createdAt: true,
    updatedAt: true,
   },
  });

  if (!userData) {
   return NextResponse.json(
    { error: 'User not found' },
    { status: 404 }
   );
  }

  return NextResponse.json({
   user: {
    ...userData,
    isBanned: false, // Default value until migration is applied
    lastLoginAt: null, // Default value until migration is applied
    createdAt: userData.createdAt.toISOString(),
    updatedAt: userData.updatedAt.toISOString(),
   },
  });
 } catch (error) {
  console.error('Error fetching user:', error);
  return NextResponse.json(
   { error: 'Failed to fetch user' },
   { status: 500 }
  );
 }
}
