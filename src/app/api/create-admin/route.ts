import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
 try {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, name, adminPassword } = await request.json();

  if (!email || !name || !adminPassword) {
   return NextResponse.json(
    { error: 'Email, name, and admin password are required' },
    { status: 400 }
   );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
   where: { email }
  });

  if (existingUser) {
   return NextResponse.json(
    { error: 'User with this email already exists' },
    { status: 400 }
   );
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
   email,
   password: adminPassword,
   email_confirm: true,
   user_metadata: {
    name,
    role: 'ADMIN'
   }
  });

  if (authError) {
   console.error('Supabase auth error:', authError);
   return NextResponse.json(
    { error: 'Failed to create user in authentication system' },
    { status: 500 }
   );
  }

  // Create user in our database
  const newUser = await prisma.user.create({
   data: {
    id: authData.user.id,
    email,
    name,
    role: 'ADMIN',
    adminLevel: 'ADMIN',
   }
  });

  return NextResponse.json({
   message: 'Admin user created successfully',
   user: {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    adminLevel: newUser.adminLevel,
   }
  }, { status: 201 });
 } catch (error) {
  console.error('Create admin error:', error);
  return NextResponse.json(
   { error: 'Failed to create admin user' },
   { status: 500 }
  );
 }
}

export async function GET(request: NextRequest) {
 try {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admins = await prisma.user.findMany({
   where: { role: 'ADMIN' },
   select: {
    id: true,
    email: true,
    name: true,
    role: true,
    adminLevel: true,
    createdAt: true,
   },
   orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ admins });
 } catch (error) {
  console.error('Get admins error:', error);
  return NextResponse.json(
   { error: 'Failed to fetch admins' },
   { status: 500 }
  );
 }
}
