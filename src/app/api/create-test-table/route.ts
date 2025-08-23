import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const prisma = new PrismaClient();
    
    // Create a simple test table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Check if table was created
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
      message: 'Test table created',
    });
  } catch (error: any) {
    console.error('Create test table error:', error);
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
