// Test script to verify authentication setup
// Run this with: node test-auth-setup.js

const BASE_URL = 'http://localhost:3000';

async function testAuthSetup() {
  console.log('🧪 Testing Authentication Setup...\n');

  try {
    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    const testResponse = await fetch(`${BASE_URL}/api/test-auth`);
    const testData = await testResponse.json();
    
    if (testData.success && testData.databaseConnected) {
      console.log('✅ Database connected successfully');
      console.log(`   User count: ${testData.userCount}`);
    } else {
      console.log('❌ Database connection failed');
      console.log('   Error:', testData.error);
      return;
    }

    // Test 2: Create Test User
    console.log('\n2. Creating test user...');
    const createResponse = await fetch(`${BASE_URL}/api/create-test-user`, {
      method: 'POST'
    });
    const createData = await createResponse.json();
    
    if (createData.message) {
      console.log('✅ Test user created/verified');
      console.log(`   Email: ${createData.credentials?.email || 'test@example.com'}`);
      console.log(`   Password: ${createData.credentials?.password || 'password123'}`);
    } else {
      console.log('❌ Failed to create test user');
      console.log('   Error:', createData.error);
      return;
    }

    // Test 3: Test Login
    console.log('\n3. Testing login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    const loginData = await loginResponse.json();
    
    if (loginResponse.ok && loginData.user) {
      console.log('✅ Login successful');
      console.log(`   User: ${loginData.user.name} (${loginData.user.email})`);
    } else {
      console.log('❌ Login failed');
      console.log('   Error:', loginData.message);
      return;
    }

    console.log('\n🎉 All tests passed! Authentication system is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('   1. Go to http://localhost:3000/login');
    console.log('   2. Use email: test@example.com, password: password123');
    console.log('   3. You should be redirected to the dashboard');

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure your development server is running');
    console.log('   2. Check your .env.local file has correct MONGODB_URI');
    console.log('   3. Verify your MongoDB password is correct');
    console.log('   4. Ensure your IP is whitelisted in MongoDB Atlas');
  }
}

// Run the test
testAuthSetup();
