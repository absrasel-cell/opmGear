const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  console.log('🔌 Testing database connections...\n');

  // Test direct connection
  console.log('Testing DIRECT_URL connection...');
  const prismaWithDirect = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL,
      },
    },
  });

  try {
    await prismaWithDirect.$connect();
    console.log('✅ DIRECT_URL connection successful');
    
    const count = await prismaWithDirect.user.count();
    console.log('User count:', count);
    await prismaWithDirect.$disconnect();
  } catch (error) {
    console.error('❌ DIRECT_URL failed:', error.message);
  }

  console.log('\nTesting DATABASE_URL connection...');
  const prismaWithDatabase = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    await prismaWithDatabase.$connect();
    console.log('✅ DATABASE_URL connection successful');
    
    const count = await prismaWithDatabase.user.count();
    console.log('User count:', count);
    await prismaWithDatabase.$disconnect();
  } catch (error) {
    console.error('❌ DATABASE_URL failed:', error.message);
  }
}

testDatabaseConnection();