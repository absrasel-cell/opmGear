import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'redxtrm02@gmail.com';
  
  console.log('Checking Supabase Auth for email:', email);

  // Try to get user info from Supabase Auth
  // Note: This will only work if we have admin access
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
   console.error('Error accessing Supabase Auth:', error);
   return NextResponse.json({
    success: false,
    error: 'Cannot access Supabase Auth admin functions',
    details: error.message
   });
  }

  const user = users.find(u => u.email === email);
  
  if (user) {
   return NextResponse.json({
    success: true,
    userExists: true,
    user: {
     id: user.id,
     email: user.email,
     name: user.user_metadata?.name,
     emailConfirmed: user.email_confirmed_at ? true : false,
     createdAt: user.created_at,
     lastSignIn: user.last_sign_in_at
    }
   });
  } else {
   return NextResponse.json({
    success: true,
    userExists: false,
    message: 'User not found in Supabase Auth'
   });
  }

 } catch (error: any) {
  console.error('Test auth user error:', error);
  return NextResponse.json(
   { 
    success: false, 
    error: error.message,
   },
   { status: 500 }
  );
 }
}
