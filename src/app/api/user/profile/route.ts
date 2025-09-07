import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser, requireAuth } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
 try {
  const user = await requireAuth(request);

  const { data: profile, error: profileError } = await supabaseAdmin
   .from('User')
   .select(`
    id,
    email,
    name,
    accessRole,
    customerRole,
    adminLevel,
    phone,
    company,
    avatarUrl,
    address,
    preferences,
    createdAt,
    updatedAt
   `)
   .eq('id', user.id)
   .single();

  if (profileError || !profile) {
   console.error('Profile fetch error:', profileError);
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

  const { data: updatedProfile, error: updateError } = await supabaseAdmin
   .from('User')
   .update(allowedUpdates)
   .eq('id', user.id)
   .select(`
    id,
    email,
    name,
    accessRole,
    customerRole,
    adminLevel,
    phone,
    company,
    avatarUrl,
    address,
    preferences
   `)
   .single();

  if (updateError || !updatedProfile) {
   console.error('Profile update error:', updateError);
   throw new Error('Failed to update profile in database');
  }

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