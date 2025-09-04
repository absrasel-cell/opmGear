import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'redxtrm02@gmail.com';
  
  console.log('Checking for user with email:', email);
  
  // Check if user exists in our database
  const user = await prisma.user.findUnique({
   where: { email: email },
   select: {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
   }
  });
  
  // Get all users for comparison
  const allUsers = await prisma.user.findMany({
   select: {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
   },
   orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
   success: true,
   targetEmail: email,
   userExists: !!user,
   user: user,
   allUsers: allUsers,
   totalUsers: allUsers.length,
  });
 } catch (error: any) {
  console.error('Test user email error:', error);
  return NextResponse.json(
   { 
    success: false, 
    error: error.message,
    code: error.code,
   },
   { status: 500 }
  );
 }
}
