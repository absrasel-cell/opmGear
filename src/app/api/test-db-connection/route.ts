import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
 try {
  console.log('Testing database connection...');
  
  // Test basic connection
  const result = await prisma.$queryRaw`SELECT 1 as test`;
  console.log('Database connection test result:', result);
  
  // Test user count
  const userCount = await prisma.user.count();
  console.log('User count:', userCount);
  
  // Test if we can fetch a single user
  const firstUser = await prisma.user.findFirst({
   select: {
    id: true,
    email: true,
    name: true,
    role: true,
   }
  });
  console.log('First user:', firstUser);
  
  return NextResponse.json({
   success: true,
   message: 'Database connection successful',
   userCount,
   firstUser,
   testResult: result
  });
  
 } catch (error) {
  console.error('Database connection test failed:', error);
  return NextResponse.json({
   success: false,
   error: 'Database connection failed',
   details: error instanceof Error ? error.message : 'Unknown error',
   stack: error instanceof Error ? error.stack : undefined
  }, { status: 500 });
 }
}
