// Removed Prisma - migrated to Supabase

export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;
  
  // Use a transaction to ensure sequential numbering without race conditions
  const result = await prisma.$transaction(async (tx) => {
    // Find the highest sequential number for the current month
    const lastInvoice = await tx.invoice.findFirst({
      where: {
        number: {
          startsWith: `INV-${yearMonth}-`
        }
      },
      orderBy: {
        number: 'desc'
      }
    });

    let nextSequential = 1;
    
    if (lastInvoice) {
      // Extract the sequential number from the last invoice
      const lastNumber = lastInvoice.number.split('-')[2];
      nextSequential = parseInt(lastNumber, 10) + 1;
    }

    const sequentialPart = String(nextSequential).padStart(4, '0');
    return `INV-${yearMonth}-${sequentialPart}`;
  });

  return result;
}