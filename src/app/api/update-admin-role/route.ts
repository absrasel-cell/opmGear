import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
 try {
  
  // Update absrasel@gmail.com to ADMIN role
  const updatedUser = await prisma.user.update({
   where: { email: 'absrasel@gmail.com' },
   data: { 
    role: 'ADMIN',
    adminLevel: 'MASTER'
   },
   select: {
    id: true,
    email: true,
    name: true,
    role: true,
    adminLevel: true,
    createdAt: true,
   }
  });
  
  await prisma.$disconnect();

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
