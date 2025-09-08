const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fhxnzfstoxpqkjkrtcbm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeG56ZnN0b3hwcWtqa3J0Y2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjYzNTQ3MCwiZXhwIjoyMDQ4MjExNDcwfQ.xwPJGkGnuUlUU_TKrEjFrMKhlLQJf9lOIDgwqGTEbNY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getOrderData() {
  try {
    const { data: order, error } = await supabase
      .from('Order')
      .select('*')
      .eq('id', '9e62191c-9335-4512-a76d-522c95a6ff8e')
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('🔍 Order 95a6ff8e stored data:');
    console.log('ID:', order.id);
    console.log('selectedOptions type:', typeof order.selectedOptions);
    console.log('selectedOptions content:', JSON.stringify(order.selectedOptions, null, 2));
    console.log('multiSelectOptions type:', typeof order.multiSelectOptions);  
    console.log('multiSelectOptions content:', JSON.stringify(order.multiSelectOptions, null, 2));
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

getOrderData();