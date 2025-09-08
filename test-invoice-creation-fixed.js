// Test script to verify invoice creation works
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInvoiceCreation() {
  console.log('🧪 Testing invoice creation...\n');

  try {
    // 1. Get a real order
    console.log('1️⃣ Finding existing order...');
    const { data: orders, error: orderError } = await supabase
      .from('Order')
      .select('id, userId, productName, calculatedTotal, status, totalUnits')
      .limit(1);

    if (orderError || !orders?.length) {
      console.error('❌ No orders found:', orderError);
      return;
    }

    const order = orders[0];
    console.log('✅ Found order:', {
      id: order.id,
      userId: order.userId,
      productName: order.productName,
      total: order.calculatedTotal,
      units: order.totalUnits,
      status: order.status
    });

    // 2. Check if user exists
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id, email, name')
      .eq('id', order.userId)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return;
    }

    console.log('✅ Found user:', user.email);

    // 3. Test invoice creation with proper ID
    console.log('\n2️⃣ Creating test invoice...');
    const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const invoiceNumber = `TEST-${Date.now()}`;

    const invoiceData = {
      id: invoiceId,
      number: invoiceNumber,
      orderId: order.id,
      customerId: order.userId,
      status: 'ISSUED',
      subtotal: parseFloat(order.calculatedTotal || 100),
      discount: 0,
      shipping: 0,
      tax: 0,
      total: parseFloat(order.calculatedTotal || 100),
      notes: 'Test invoice - automated test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('📄 Invoice data:', invoiceData);

    const { data: newInvoice, error: createError } = await supabase
      .from('Invoice')
      .insert(invoiceData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Invoice creation failed:', createError);
      return;
    }

    console.log('✅ Invoice created successfully:', {
      id: newInvoice.id,
      number: newInvoice.number,
      total: newInvoice.total
    });

    // 4. Create test invoice items
    console.log('\n3️⃣ Creating test invoice items...');
    const invoiceItems = [
      {
        id: `item_${Date.now()}_1`,
        invoiceId: newInvoice.id,
        name: order.productName,
        description: 'Custom baseball cap',
        quantity: order.totalUnits || 1,
        unitPrice: parseFloat(order.calculatedTotal || 100) / (order.totalUnits || 1),
        total: parseFloat(order.calculatedTotal || 100)
      }
    ];

    const { data: items, error: itemsError } = await supabase
      .from('InvoiceItem')
      .insert(invoiceItems)
      .select();

    if (itemsError) {
      console.error('❌ Invoice items creation failed:', itemsError);
    } else {
      console.log('✅ Invoice items created:', items.length);
    }

    // 5. Test fetching the complete invoice
    console.log('\n4️⃣ Testing invoice retrieval...');
    
    const { data: fetchedInvoice, error: fetchError } = await supabase
      .from('Invoice')
      .select('*')
      .eq('id', newInvoice.id)
      .single();

    if (fetchError) {
      console.error('❌ Invoice fetch failed:', fetchError);
    } else {
      console.log('✅ Invoice fetched successfully:', fetchedInvoice.number);
    }

    // 6. Test API endpoint simulation
    console.log('\n5️⃣ Testing API-like access...');
    
    // Simulate what the user invoice endpoint does
    const { data: userInvoices, error: userInvoicesError } = await supabase
      .from('Invoice')
      .select('*')
      .eq('customerId', user.id);

    if (userInvoicesError) {
      console.error('❌ User invoices fetch failed:', userInvoicesError);
    } else {
      console.log('✅ User invoices fetched:', userInvoices.length, 'invoices');
    }

    // 7. Clean up
    console.log('\n6️⃣ Cleaning up...');
    
    // Delete items first
    if (items?.length) {
      await supabase
        .from('InvoiceItem')
        .delete()
        .eq('invoiceId', newInvoice.id);
    }
    
    // Delete invoice
    await supabase
      .from('Invoice')
      .delete()
      .eq('id', newInvoice.id);
      
    console.log('🗑️ Test data cleaned up');

    console.log('\n🎉 Invoice creation test completed successfully!');
    
    // 8. Summary of what to do next
    console.log('\n📝 Next steps:');
    console.log('   1. Invoice creation works with explicit ID');
    console.log('   2. Test the checkout success page with a real order');
    console.log('   3. Test PDF generation');
    console.log('   4. Verify admin dashboard displays invoices');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testInvoiceCreation().catch(console.error);