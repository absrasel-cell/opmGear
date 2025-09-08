const { Client } = require('pg');
const fs = require('fs');

async function applyInvoiceSchema() {
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.nowxzkdkaegjwfhhqoez',
    password: 'uscustomcap123',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Read the SQL file
    const sqlContent = fs.readFileSync('create-invoice-schema.sql', 'utf8');
    
    console.log('📋 Applying Invoice table schema...');
    const result = await client.query(sqlContent);
    
    console.log('✅ Invoice tables created successfully!');
    console.log('📊 Result:', result.rows);
    
  } catch (error) {
    console.error('❌ Error creating Invoice tables:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

applyInvoiceSchema();