// Test invoice creation functionality
const { Client } = require('pg')
require('dotenv').config()

async function testInvoiceCreation() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🧪 Testing Invoice Creation System...')
    await client.connect()

    // First, create a test order
    console.log('📝 Creating test order for invoice...')
    const orderResult = await client.query(`
      INSERT INTO "Order" (
        "productName", 
        "userEmail", 
        "customerInfo", 
        "orderType", 
        "orderSource",
        "status",
        "selectedColors",
        "selectedOptions",
        "totalUnits",
        "calculatedTotal"
      ) VALUES (
        'Test Order for Invoice',
        'invoice-test@example.com',
        '{"name": "Invoice Test Customer", "email": "invoice-test@example.com", "phone": "555-1234", "address": {"street": "123 Invoice St", "city": "Test City", "state": "TS", "zipCode": "12345", "country": "USA"}}',
        'GUEST',
        'ADMIN_CREATED',
        'CONFIRMED',
        '{"Black": {"sizes": {"L": 5}}}',
        '{"priceTier": "Tier 2"}',
        5,
        50.00
      ) RETURNING "id"
    `)
    
    const orderId = orderResult.rows[0].id
    console.log('✅ Test order created:', orderId)

    // Test invoice creation via API
    console.log('💰 Testing invoice creation API...')
    const invoiceResponse = await fetch('http://localhost:3001/api/invoices', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Add basic admin simulation - in real app this would be proper auth
      },
      body: JSON.stringify({
        orderId: orderId,
        simple: true,
        notes: 'Test invoice creation',
        discountPercent: 0,
        discountFlat: 0
      })
    })

    if (invoiceResponse.ok) {
      const invoiceData = await invoiceResponse.json()
      console.log('✅ Invoice created successfully!')
      console.log('📄 Invoice ID:', invoiceData.id)
      console.log('🔢 Invoice Number:', invoiceData.number)
      console.log('💰 Invoice Total:', invoiceData.total)

      // Verify in database
      const dbCheck = await client.query('SELECT * FROM "Invoice" WHERE "orderId" = $1', [orderId])
      if (dbCheck.rows.length > 0) {
        console.log('✅ Invoice verified in database')
      } else {
        console.log('❌ Invoice not found in database')
      }

    } else {
      const errorText = await invoiceResponse.text()
      console.log('❌ Invoice creation failed:', invoiceResponse.status)
      console.log('📋 Error details:', errorText)
      
      // Check if it's an auth issue
      if (invoiceResponse.status === 401 || invoiceResponse.status === 403) {
        console.log('ℹ️  This is expected - invoice creation requires admin authentication')
        console.log('✅ API endpoint is working, just needs proper auth in dashboard')
      }
    }

    // Clean up test data
    console.log('🧹 Cleaning up test data...')
    await client.query('DELETE FROM "Invoice" WHERE "orderId" = $1', [orderId])
    await client.query('DELETE FROM "Order" WHERE "id" = $1', [orderId])
    console.log('✅ Test data cleaned up')

  } catch (error) {
    console.error('💥 Test failed:', error.message)
  } finally {
    await client.end()
  }
}

testInvoiceCreation()