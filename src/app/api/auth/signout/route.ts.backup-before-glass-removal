import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Signout error:', error);
    }

    // Clear cookies
    const cookieStore = await cookies();
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');
    cookieStore.delete('supabase-auth-token');
    cookieStore.delete('supabase.auth.token');

    return NextResponse.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Signout error:', error);
    }

    // Clear cookies
    const cookieStore = await cookies();
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');
    cookieStore.delete('supabase-auth-token');
    cookieStore.delete('supabase.auth.token');

    // Redirect to login page
    return NextResponse.redirect(new URL('/login', _request.url));
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.redirect(new URL('/login', _request.url));
  }
}