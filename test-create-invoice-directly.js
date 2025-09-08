// Test creating an invoice directly using the database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Import the invoice calculation function
const path = require('path');
const fs = require('fs');

async function testCreateInvoiceDirectly() {
  console.log('🧪 Testing invoice creation directly...\n');

  try {
    // 1. Get a real order
    const { data: order, error: orderError } = await supabase
      .from('Order')
      .select('*')
      .eq('id', '488b976a-cb28-4eba-88e4-fdf4537563aa')
      .single();

    if (orderError || !order) {
      console.error('❌ Order not found:', orderError);
      return;
    }

    console.log('✅ Found order:', {
      id: order.id,
      productName: order.productName,
      calculatedTotal: order.calculatedTotal,
      userId: order.userId
    });

    // 2. Check if invoice already exists
    const { data: existingInvoice, error: existingError } = await supabase
      .from('Invoice')
      .select('*')
      .eq('orderId', order.id)
      .single();

    if (existingInvoice) {
      console.log('ℹ️ Invoice already exists:', existingInvoice.number);
      console.log('📄 Testing PDF generation with existing invoice...');
      
      // Test PDF generation
      try {
        const response = await fetch(`http://localhost:3003/api/invoices/${existingInvoice.id}/pdf`);
        console.log('📄 PDF endpoint response status:', response.status);
        
        if (response.ok) {
          console.log('✅ PDF generation works!');
        } else {
          const errorText = await response.text();
          console.log('❌ PDF generation failed:', errorText);
        }
      } catch (error) {
        console.log('❌ PDF test error:', error.message);
      }
      
      return;
    }

    console.log('📋 No existing invoice found, creating new one...');

    // 3. Generate invoice data
    const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    // Simple invoice calculation based on order data
    const subtotal = parseFloat(order.calculatedTotal || 0);
    const tax = 0;
    const shipping = 0;
    const discount = 0;
    const total = subtotal + tax + shipping - discount;

    // 4. Create invoice record
    const invoiceData = {
      id: invoiceId,
      number: invoiceNumber,
      orderId: order.id,
      customerId: order.userId,
      status: 'ISSUED',
      subtotal,
      tax,
      shipping,
      discount,
      total,
      notes: `Invoice for Order #${order.id}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('💰 Creating invoice:', invoiceData);

    const { data: newInvoice, error: invoiceError } = await supabase
      .from('Invoice')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) {
      console.error('❌ Invoice creation failed:', invoiceError);
      return;
    }

    console.log('✅ Invoice created:', newInvoice.number);

    // 5. Create invoice items
    const invoiceItems = [{
      id: `item_${Date.now()}_1`,
      invoiceId: newInvoice.id,
      name: order.productName,
      description: `Custom ${order.productName} - ${order.totalUnits} units`,
      quantity: order.totalUnits || 1,
      unitPrice: total / (order.totalUnits || 1),
      total: total
    }];

    const { data: items, error: itemsError } = await supabase
      .from('InvoiceItem')
      .insert(invoiceItems)
      .select();

    if (itemsError) {
      console.error('❌ Invoice items creation failed:', itemsError);
    } else {
      console.log('✅ Invoice items created:', items.length);
    }

    // 6. Test PDF generation
    console.log('📄 Testing PDF generation...');
    
    try {
      const response = await fetch(`http://localhost:3003/api/invoices/${newInvoice.id}/pdf`);
      console.log('📄 PDF endpoint response status:', response.status);
      
      if (response.ok) {
        console.log('✅ PDF generation works!');
        console.log('📄 PDF headers:', Object.fromEntries(response.headers.entries()));
      } else {
        const errorText = await response.text();
        console.log('❌ PDF generation failed:', errorText);
      }
    } catch (error) {
      console.log('❌ PDF test error:', error.message);
    }

    console.log('\n🎉 Invoice creation test completed!');
    console.log('\n📝 Summary:');
    console.log(`   ✅ Invoice created: ${newInvoice.number}`);
    console.log(`   ✅ Total amount: $${total}`);
    console.log(`   ✅ Order ID: ${order.id}`);
    console.log(`   ✅ Customer ID: ${order.userId}`);
    console.log('\n🔗 Test URLs:');
    console.log(`   Checkout Success: http://localhost:3003/checkout/success?orderId=${order.id}`);
    console.log(`   PDF Download: http://localhost:3003/api/invoices/${newInvoice.id}/pdf`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCreateInvoiceDirectly().catch(console.error);