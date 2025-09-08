// Check if the new detailed invoice was created successfully
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkRecentInvoices() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 Checking for recent invoices...\n');
  
  const { data: invoices, error } = await supabase
    .from('Invoice')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(3);

  if (invoices && invoices.length > 0) {
    console.log(`📄 Found ${invoices.length} recent invoices:`);
    
    for (const invoice of invoices) {
      console.log(`\n  Invoice: ${invoice.id} (${invoice.number})`);
      console.log(`    Order: ${invoice.orderId}`);
      console.log(`    Total: $${invoice.total}`);
      console.log(`    Status: ${invoice.status}`);
      console.log(`    Created: ${invoice.createdAt}`);
      
      // Get items for this invoice
      const { data: items } = await supabase
        .from('InvoiceItem')
        .select('*')
        .eq('invoiceId', invoice.id);
      
      console.log(`    Items: ${items?.length || 0}`);
      if (items && items.length > 0) {
        items.forEach((item, index) => {
          console.log(`      ${index + 1}. ${item.name}`);
          console.log(`         Description: ${item.description}`);
          console.log(`         Qty: ${item.quantity}, Price: $${item.unitPrice}, Total: $${item.total}`);
        });
        
        if (items.length >= 4) {
          console.log('\n🎉 SUCCESS: Invoice has detailed line items (4+ items)!');
          console.log('✅ Expected: Base Product, Logo Setup, Closure, Delivery, Mold Charge');
        } else {
          console.log(`\n⚠️  Only ${items.length} items found, expected at least 4 detailed items`);
        }
      }
    }
  } else {
    console.log('ℹ️  No recent invoices found');
  }
}

checkRecentInvoices().catch(console.error);