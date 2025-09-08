// Check what detailed items are in the existing invoice
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkInvoiceDetails() {
  console.log('🔍 Checking existing invoice details...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the specific invoice that was just created
    const { data: invoice, error: invoiceError } = await supabase
      .from('Invoice')
      .select('*')
      .eq('id', 'invoice_1757314632721_0qfd7380l')
      .single();

    if (invoiceError || !invoice) {
      console.error('❌ Invoice not found:', invoiceError);
      return;
    }

    console.log('📄 Invoice Overview:');
    console.log(`  ID: ${invoice.id}`);
    console.log(`  Number: ${invoice.number}`);
    console.log(`  Status: ${invoice.status}`);
    console.log(`  Total: $${invoice.total}`);
    console.log(`  Subtotal: $${invoice.subtotal}`);

    // Get invoice items
    const { data: items, error: itemsError } = await supabase
      .from('InvoiceItem')
      .select('*')
      .eq('invoiceId', invoice.id)
      .order('id');

    console.log('\n📋 Invoice Items:');
    if (!items || items.length === 0) {
      console.log('❌ NO INVOICE ITEMS FOUND');
    } else {
      console.log(`✅ Found ${items.length} items:`);
      items.forEach((item, index) => {
        console.log(`\n  Item ${index + 1}:`);
        console.log(`    Name: ${item.name}`);
        console.log(`    Description: ${item.description}`);
        console.log(`    Quantity: ${item.quantity}`);
        console.log(`    Unit Price: $${item.unitPrice}`);
        console.log(`    Total: $${item.total}`);
      });
    }

    // Check what the cost calculation should show
    console.log('\n🎯 Expected PDF Items:');
    console.log('1. Base Product: 6P Flat Bill - 144 units × $4.00 = $576.00');
    console.log('2. Logo Setup: Large Leather Patch + Run - 144 units × $2.88 = $414.72');
    console.log('3. Closure: Stretched - 144 units × $0.88 = $126.72');
    console.log('4. Delivery: Regular Delivery - 144 units × $3.29 = $473.76');
    console.log('5. Colors: Burnt Orange, Medium size');

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkInvoiceDetails().catch(console.error);