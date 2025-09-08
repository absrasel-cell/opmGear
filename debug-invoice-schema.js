// Debug script to check invoice schema and test invoice creation
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInvoiceSchema() {
  console.log('🔍 Debugging Invoice schema and creation...\n');

  try {
    // 1. Check Invoice table structure
    console.log('1️⃣ Checking Invoice table structure...');
    const { data: invoices, error: invoiceError } = await supabase
      .from('Invoice')
      .select('*')
      .limit(1);

    if (invoiceError) {
      console.error('❌ Invoice table error:', invoiceError);
    } else {
      console.log('✅ Invoice table accessible:', invoices?.length || 0, 'records found');
    }

    // 2. Check Order table
    console.log('\n2️⃣ Checking Order table...');
    const { data: orders, error: orderError } = await supabase
      .from('Order')
      .select('id, userId, productName')
      .limit(1);

    if (orderError) {
      console.error('❌ Order table error:', orderError);
    } else {
      console.log('✅ Order table accessible:', orders?.length || 0, 'records found');
      if (orders && orders.length > 0) {
        console.log('📋 Sample order:', orders[0]);
      }
    }

    // 3. Check User table
    console.log('\n3️⃣ Checking User table...');
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('id, email')
      .limit(1);

    if (userError) {
      console.error('❌ User table error:', userError);
    } else {
      console.log('✅ User table accessible:', users?.length || 0, 'records found');
    }

    // 4. Test simple invoice creation
    console.log('\n4️⃣ Testing simple invoice creation...');
    
    if (orders && orders.length > 0 && users && users.length > 0) {
      const testOrder = orders[0];
      const testUser = users[0];
      
      console.log('🧪 Creating test invoice for:', testOrder.id);
      
      const invoiceData = {
        number: `TEST-${Date.now()}`,
        orderId: testOrder.id,
        customerId: testUser.id,
        status: 'ISSUED',
        subtotal: 100.00,
        discount: 0.00,
        shipping: 0.00,
        tax: 0.00,
        total: 100.00,
        notes: 'Test invoice creation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { data: newInvoice, error: createError } = await supabase
        .from('Invoice')
        .insert(invoiceData)
        .select()
        .single();

      if (createError) {
        console.error('❌ Test invoice creation failed:', createError);
        
        // Check if it's an ID constraint issue
        if (createError.code === '23502' && createError.message.includes('id')) {
          console.log('\n🔧 Trying with explicit ID...');
          const invoiceWithId = {
            ...invoiceData,
            id: `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          const { data: newInvoiceWithId, error: createWithIdError } = await supabase
            .from('Invoice')
            .insert(invoiceWithId)
            .select()
            .single();
            
          if (createWithIdError) {
            console.error('❌ Invoice creation with ID also failed:', createWithIdError);
          } else {
            console.log('✅ Invoice creation with explicit ID succeeded:', newInvoiceWithId.id);
            
            // Clean up test invoice
            await supabase
              .from('Invoice')
              .delete()
              .eq('id', newInvoiceWithId.id);
            console.log('🗑️ Test invoice cleaned up');
          }
        }
      } else {
        console.log('✅ Test invoice creation succeeded:', newInvoice.id);
        
        // Clean up test invoice
        await supabase
          .from('Invoice')
          .delete()
          .eq('id', newInvoice.id);
        console.log('🗑️ Test invoice cleaned up');
      }
    } else {
      console.log('⚠️ Skipping invoice creation test - no orders or users found');
    }

    // 5. Check foreign key relationships
    console.log('\n5️⃣ Checking foreign key relationships...');
    
    try {
      const { data: invoiceWithOrder, error: relationError } = await supabase
        .from('Invoice')
        .select(`
          id,
          number,
          orderId,
          order:Order!Invoice_orderId_fkey (id, productName)
        `)
        .limit(1);

      if (relationError) {
        console.error('❌ Invoice-Order relationship error:', relationError);
      } else {
        console.log('✅ Invoice-Order relationship works');
      }
    } catch (error) {
      console.error('❌ Relationship check failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

debugInvoiceSchema().catch(console.error);