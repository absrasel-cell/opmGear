import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
 try {
  const user = await requireAuth(request);

  const profile = await prisma.user.findUnique({
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
    address: true,
    preferences: true,
    createdAt: true,
    updatedAt: true,
   },
  });

  if (!profile) {
   return NextResponse.json(
    { error: 'Profile not found' },
    { status: 404 }
   );
  }

  return NextResponse.json({ profile });
 } catch (error: any) {
  if (error.message === 'Unauthorized') {
   return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
   );
  }
  console.error('Error fetching profile:', error);
  return NextResponse.json(
   { error: 'Failed to fetch profile' },
   { status: 500 }
  );
 }
}

export async function PATCH(request: NextRequest) {
 try {
  const user = await requireAuth(request);
  const updates = await request.json();

  // Don't allow updating certain fields
  const { id, email, accessRole, customerRole, adminLevel, createdAt, updatedAt, ...allowedUpdates } = updates;

  const updatedProfile = await prisma.user.update({
   where: { id: user.id },
   data: allowedUpdates,
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
    address: true,
    preferences: true,
   },
  });

  return NextResponse.json({
   message: 'Profile updated successfully',
   profile: updatedProfile,
  });
 } catch (error: any) {
  if (error.message === 'Unauthorized') {
   return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
   );
  }
  console.error('Error updating profile:', error);
  return NextResponse.json(
   { error: 'Failed to update profile' },
   { status: 500 }
  );
 }
}