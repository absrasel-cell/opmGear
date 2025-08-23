const { Client } = require('pg');

async function testAdminLogin() {
  console.log('🔍 Testing Admin Login Process...\n');

  // Test 1: Check if user exists in database
  console.log('1. Checking if absrasel@gmail.com exists in database...');
  try {
    const client = new Client({
      connectionString: 'postgresql://postgres.nowxzkdkaegjwfhhqoez:KKQYfgW3V2wvclzz@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    
    const result = await client.query(
      'SELECT id, email, name, role, "adminLevel" FROM "User" WHERE email = $1',
      ['absrasel@gmail.com']
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ User found in database:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Admin Level: ${user.adminLevel}`);
    } else {
      console.log('❌ User not found in database');
    }

    await client.end();
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }

  // Test 2: Check current session
  console.log('\n2. Checking current session...');
  try {
    const response = await fetch('http://localhost:3000/api/auth/session');
    const data = await response.json();
    
    if (data.user) {
      console.log('✅ User is currently logged in:');
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Role: ${data.user.role}`);
      console.log(`   Name: ${data.user.name}`);
    } else {
      console.log('❌ No user currently logged in');
      console.log('   You need to log in first at: http://localhost:3000/login');
    }
  } catch (error) {
    console.log('❌ Session check failed:', error.message);
  }

  // Test 3: Check admin dashboard access
  console.log('\n3. Testing admin dashboard access...');
  try {
    const response = await fetch('http://localhost:3000/api/test-user');
    const data = await response.json();
    
    if (data.success && data.targetUser) {
      console.log('✅ Admin user data accessible:');
      console.log(`   Email: ${data.targetUser.email}`);
      console.log(`   Role: ${data.targetUser.role}`);
      console.log(`   Created: ${data.targetUser.createdAt}`);
    } else {
      console.log('❌ Admin user data not accessible');
    }
  } catch (error) {
    console.log('❌ Admin user check failed:', error.message);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Go to: http://localhost:3000/login');
  console.log('2. Login with: absrasel@gmail.com');
  console.log('3. After login, you should be redirected to: http://localhost:3000/dashboard/admin');
  console.log('4. If you still can\'t access admin dashboard, check browser console for errors');
}

testAdminLogin().catch(console.error);
