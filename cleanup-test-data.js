const { Client } = require('pg')
require('dotenv').config()

async function cleanup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    await client.connect()
    await client.query('DELETE FROM "Order" WHERE "userEmail" = $1', ['test@example.com'])
    console.log('🧹 Test order cleaned up')
  } catch (error) {
    console.log('⚠️ Could not clean test data:', error.message)
  } finally {
    await client.end()
  }
}

cleanup()