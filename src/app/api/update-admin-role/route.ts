import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
 try {
  
  // Update absrasel@gmail.com to ADMIN role
  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from('User')
    .update({
      role: 'ADMIN',
      adminLevel: 'MASTER'
    })
    .eq('email', 'absrasel@gmail.com')
    .select('id, email, name, role, adminLevel, createdAt')
    .single();

  if (updateError) {
    console.error('Update error:', updateError);
    return NextResponse.json(
      { 
        success: false, 
        error: updateError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
   success: true,
   message: 'User role updated successfully',
   user: updatedUser,
  });
 } catch (error: any) {
  console.error('Update admin role error:', error);
  return NextResponse.json(
   { 
    success: false, 
    error: error.message,
   },
   { status: 500 }
  );
 }
}
