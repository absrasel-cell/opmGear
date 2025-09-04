import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET(request: NextRequest) {
 try {
  console.log('Testing Prisma connection...');
  
  // Create a new Prisma client instance
  const prisma = new PrismaClient({
   log: ['query', 'info', 'warn', 'error'],
  });
  
  // Test the connection with a simple query
  const result = await prisma.$queryRaw`SELECT 1 as test`;
  
  console.log('Prisma connection successful:', result);
  
  await prisma.$disconnect();

  return NextResponse.json({
   success: true,
   message: 'Prisma connection successful',
   result: result
  });

 } catch (error: any) {
  console.error('Prisma connection test error:', error);
  
  return NextResponse.json(
   { 
    success: false, 
    error: error.message,
    code: error.code,
    meta: error.meta,
   },
   { status: 500 }
  );
 }
}
