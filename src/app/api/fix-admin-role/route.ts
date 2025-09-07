import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
 try {
  const supabaseUser = await getCurrentUser(request);
  if (!supabaseUser) {
   return NextResponse.json({ error: 'No user found' }, { status: 401 });
  }

  console.log('Fixing admin role for user:', supabaseUser.email);

  // Check if user exists in database
  let userProfile = await getUserProfile(supabaseUser.id);
  
  if (!userProfile) {
   // Create user if they don't exist
   console.log('Creating user in database...');
   const { data: newUser, error: createError } = await supabaseAdmin
    .from('User')
    .insert({
     id: supabaseUser.id,
     email: supabaseUser.email!,
     name: supabaseUser.user_metadata?.name || null,
     role: 'ADMIN', // Set as admin for testing
    })
    .select('id, email, name, role, adminLevel, phone, company, avatarUrl')
    .single();

   if (createError || !newUser) {
    throw new Error(`Failed to create user: ${createError?.message}`);
   }
   
   userProfile = newUser;
   console.log('User created with admin role');
  } else {
   // Update existing user to admin role
   console.log('Updating user role to admin...');
   const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from('User')
    .update({ role: 'ADMIN' })
    .eq('id', supabaseUser.id)
    .select('id, email, name, role, adminLevel, phone, company, avatarUrl')
    .single();

   if (updateError || !updatedUser) {
    throw new Error(`Failed to update user: ${updateError?.message}`);
   }
   
   userProfile = updatedUser;
   console.log('User role updated to admin');
  }

  return NextResponse.json({
   success: true,
   message: 'Admin role fixed successfully',
   user: userProfile
  });

 } catch (error) {
  console.error('Error fixing admin role:', error);
  return NextResponse.json({ 
   error: 'Failed to fix admin role',
   details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
 }
}
