import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Creating Invoice tables...');

    // Create Invoice table
    const createInvoiceTableSQL = `
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "invoiceNumber" TEXT UNIQUE NOT NULL,
        "orderId" TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED')),
        "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "discountPercent" DECIMAL(5,2) DEFAULT 0,
        "discountFlat" DECIMAL(12,2) DEFAULT 0,
        "notes" TEXT,
        "dueDate" TIMESTAMP WITH TIME ZONE,
        "paidAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    await supabaseAdmin.rpc('exec_sql', { sql_query: createInvoiceTableSQL });
    console.log('✅ Invoice table created');

    // Create InvoiceItem table
    const createInvoiceItemTableSQL = `
      CREATE TABLE IF NOT EXISTS "InvoiceItem" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "invoiceId" TEXT NOT NULL REFERENCES "Invoice"(id) ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "category" TEXT DEFAULT 'item',
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    await supabaseAdmin.rpc('exec_sql', { sql_query: createInvoiceItemTableSQL });
    console.log('✅ InvoiceItem table created');

    return NextResponse.json({
      success: true,
      message: 'Invoice tables created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating Invoice tables:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create tables'
    }, { status: 500 });
  }
}