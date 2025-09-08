-- Create Invoice and InvoiceItem tables for Supabase
-- This script creates the missing invoice tables for the US Custom Cap system

-- Create Invoice table
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "number" TEXT NOT NULL UNIQUE,
    "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "customerId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "dueDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'ISSUED', 'VOID', 'REFUNDED')),
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create InvoiceItem table  
CREATE TABLE IF NOT EXISTS "InvoiceItem" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "invoiceId" TEXT NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "Invoice_orderId_idx" ON "Invoice"("orderId");
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "Invoice_number_idx" ON "Invoice"("number");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt");

CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating updatedAt timestamps
CREATE TRIGGER update_invoice_updated_at BEFORE UPDATE ON "Invoice"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoiceitem_updated_at BEFORE UPDATE ON "InvoiceItem"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Invoice table
-- Allow users to view their own invoices
CREATE POLICY "Users can view their own invoices" ON "Invoice"
    FOR SELECT USING (
        auth.uid()::text = "customerId" 
        OR auth.uid()::text IN (
            SELECT id FROM "User" WHERE role IN ('ADMIN', 'STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- Allow admins to insert/update/delete invoices
CREATE POLICY "Admins can manage all invoices" ON "Invoice"
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id FROM "User" WHERE role IN ('ADMIN', 'STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- Create RLS policies for InvoiceItem table
-- Allow users to view their invoice items (through invoice relationship)
CREATE POLICY "Users can view their invoice items" ON "InvoiceItem"
    FOR SELECT USING (
        "invoiceId" IN (
            SELECT id FROM "Invoice" WHERE 
                "customerId" = auth.uid()::text
                OR auth.uid()::text IN (
                    SELECT id FROM "User" WHERE role IN ('ADMIN', 'STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN')
                )
        )
    );

-- Allow admins to manage all invoice items
CREATE POLICY "Admins can manage all invoice items" ON "InvoiceItem"
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id FROM "User" WHERE role IN ('ADMIN', 'STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- Grant necessary permissions
GRANT ALL ON "Invoice" TO authenticated;
GRANT ALL ON "InvoiceItem" TO authenticated;
GRANT ALL ON "Invoice" TO service_role;
GRANT ALL ON "InvoiceItem" TO service_role;

COMMENT ON TABLE "Invoice" IS 'Stores invoice information for orders in the US Custom Cap system';
COMMENT ON TABLE "InvoiceItem" IS 'Stores individual line items for invoices';