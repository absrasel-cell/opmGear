// Check if invoice has items
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkInvoiceItems() {
  console.log('🔍 Checking invoice items...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // First, find an existing invoice
    const { data: invoices, error: invoicesError } = await supabase
      .from('Invoice')
      .select('*')
      .eq('orderId', 'a14b4f63-931b-4912-9302-429303d9ff6e')
      .limit(1);

    if (invoicesError || !invoices?.length) {
      console.error('❌ No invoices found:', invoicesError);
      return;
    }

    const invoice = invoices[0];
    console.log('✅ Found invoice:', {
      id: invoice.id,
      number: invoice.number,
      total: invoice.total,
      status: invoice.status
    });

    // Check for invoice items
    const { data: items, error: itemsError } = await supabase
      .from('InvoiceItem')
      .select('*')
      .eq('invoiceId', invoice.id);

    if (itemsError) {
      console.error('❌ Error fetching items:', itemsError);
      return;
    }

    console.log('\n📋 Invoice items:');
    if (!items || items.length === 0) {
      console.log('❌ NO INVOICE ITEMS FOUND - This is why PDF is missing items!');
      
      // Let's check what the order looks like for reference
      const { data: order, error: orderError } = await supabase
        .from('Order')
        .select('*')
        .eq('id', invoice.orderId)
        .single();

      if (order && !orderError) {
        console.log('\n📦 Order details for reference:');
        console.log('  Product:', order.productName);
        console.log('  Total:', order.calculatedTotal);
        console.log('  Units:', order.totalUnits);
        
        // Suggest what items should be created
        console.log('\n💡 Suggested invoice item:');
        console.log({
          invoiceId: invoice.id,
          name: order.productName,
          description: `Custom ${order.productName}`,
          quantity: order.totalUnits || 1,
          unitPrice: (parseFloat(order.calculatedTotal) || 0) / (order.totalUnits || 1),
          total: parseFloat(order.calculatedTotal) || 0
        });
      }
    } else {
      console.log(`✅ Found ${items.length} items:`);
      items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name || item.description}`);
        console.log(`     Qty: ${item.quantity}, Unit: $${item.unitPrice}, Total: $${item.total}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

checkInvoiceItems().catch(console.error);