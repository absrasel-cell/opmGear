const { PrismaClient } = require('@prisma/client');

async function testPrismaConnection() {
  console.log('🔍 Testing Prisma connection...');
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    // Test 1: Basic connection
    console.log('\n📡 Test 1: Testing basic database connection...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Basic connection successful:', result);

    // Test 2: Check if tables exist
    console.log('\n📊 Test 2: Checking database schema...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('✅ Available tables:', tables.map(t => t.table_name));

    // Test 3: Try to count users (if User table exists)
    console.log('\n👥 Test 3: Testing User table access...');
    try {
      const userCount = await prisma.user.count();
      console.log('✅ User count:', userCount);
    } catch (error) {
      console.log('⚠️  User table not accessible or empty:', error.message);
    }

    // Test 4: Check environment variables
    console.log('\n🔧 Test 4: Checking environment variables...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL) {
      const url = process.env.DATABASE_URL;
      const maskedUrl = url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
      console.log('DATABASE_URL (masked):', maskedUrl);
    }

    console.log('\n🎉 All Prisma tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Prisma connection test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Prisma client disconnected');
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

testPrismaConnection();
