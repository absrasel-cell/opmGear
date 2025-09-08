import { supabaseAdmin } from '@/lib/supabase';

export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;
  
  try {
    // Find the highest sequential number for the current month
    const { data: lastInvoice, error } = await supabaseAdmin
      .from('Invoice')
      .select('number')
      .ilike('number', `INV-${yearMonth}-%`)
      .order('number', { ascending: false })
      .limit(1)
      .single();

    let nextSequential = 1;
    
    if (!error && lastInvoice) {
      // Extract the sequential number from the last invoice
      const lastNumber = lastInvoice.number.split('-')[2];
      nextSequential = parseInt(lastNumber, 10) + 1;
    } else if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected for the first invoice of the month
      console.error('Error finding last invoice:', error);
      throw new Error('Failed to generate invoice number');
    }

    const sequentialPart = String(nextSequential).padStart(4, '0');
    return `INV-${yearMonth}-${sequentialPart}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw new Error('Failed to generate invoice number');
  }
}