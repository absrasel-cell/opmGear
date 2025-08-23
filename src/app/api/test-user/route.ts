import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const prisma = new PrismaClient();
    
    // Check if absrasel@gmail.com exists
    const user = await prisma.user.findUnique({
      where: { email: 'absrasel@gmail.com' },
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
    
    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      targetUser: user,
      allUsers: allUsers,
      userExists: !!user,
    });
  } catch (error: any) {
    console.error('Test user error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
      },
      { status: 500 }
    );
  }
}
