import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET(request: NextRequest) {
 try {
  const prisma = new PrismaClient();
  
  // Check what tables exist
  const tables = await prisma.$queryRaw`
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_type = 'BASE TABLE'
   ORDER BY table_name
  `;
  
  await prisma.$disconnect();

  return NextResponse.json({
   success: true,
   tables,
  });
 } catch (error: any) {
  console.error('Tables test error:', error);
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
