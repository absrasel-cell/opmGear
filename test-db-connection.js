const { Client } = require('pg');

// Test different connection configurations
const configs = [
  {
    name: 'Connection Pooling (Recommended)',
    connectionString: 'postgresql://postgres.nowxzkdkaegjwfhhqoez:KKQYfgW3V2wvclzz@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
  },
  {
    name: 'Direct Connection (Migrations)',
    connectionString: 'postgresql://postgres.nowxzkdkaegjwfhhqoez:KKQYfgW3V2wvclzz@aws-1-us-east-2.pooler.supabase.com:5432/postgres'
  },
  {
    name: 'Old Direct Connection',
    connectionString: 'postgresql://postgres:KKQYfgW3V2wvclzz@db.nowxzkdkaegjwfhhqoez.supabase.co:5432/postgres'
  }
];

async function testConnection(config) {
  const client = new Client({
    connectionString: config.connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`\n🔍 Testing: ${config.name}`);
    console.log(`Connection string: ${config.connectionString.replace(/:[^:@]*@/, ':****@')}`);
    
    await client.connect();
    console.log('✅ Connection successful!');
    
    const result = await client.query('SELECT version()');
    console.log('✅ Database version:', result.rows[0].version.substring(0, 50) + '...');
    
    await client.end();
    return true;
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing database connections...\n');
  
  for (const config of configs) {
    const success = await testConnection(config);
    if (success) {
      console.log(`\n🎉 Working connection found: ${config.name}`);
      console.log(`Use this in your .env file:`);
      console.log(`DATABASE_URL=${config.connectionString}`);
      break;
    }
  }
}

runTests().catch(console.error);
