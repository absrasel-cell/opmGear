import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  if (!user) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pick any admin as support recipient
  const admin = await prisma.user.findFirst({
   where: { role: 'ADMIN' },
   select: {
    id: true,
    name: true,
    email: true,
    role: true
   }
  });

  if (!admin) {
   return NextResponse.json({ error: 'No support available' }, { status: 404 });
  }

  return NextResponse.json({
   success: true,
   user: {
    id: admin.id,
    name: admin.name || 'Support Team',
    email: admin.email || ''
   }
  });
 } catch (error) {
  console.error('Support recipient error:', error);
  return NextResponse.json({ 
   success: false, 
   error: error instanceof Error ? error.message : 'Unknown error' 
  }, { status: 500 });
 }
}
