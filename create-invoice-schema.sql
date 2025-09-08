-- Create Invoice and InvoiceItem tables for US Custom Cap
-- Execute this in Supabase SQL Editor

-- Create Invoice table
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

-- Create InvoiceItem table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "Invoice_orderId_idx" ON "Invoice"("orderId");
CREATE INDEX IF NOT EXISTS "Invoice_userId_idx" ON "Invoice"("userId");
CREATE INDEX IF NOT EXISTS "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- Create triggers to update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoice_updated_at BEFORE UPDATE ON "Invoice"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_invoice_item_updated_at BEFORE UPDATE ON "InvoiceItem"
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Invoice table
CREATE POLICY "Users can view their own invoices" ON "Invoice"
FOR SELECT USING (
  "userId" = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM "User" 
    WHERE "id" = auth.uid()::text 
    AND "accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF')
  )
);

CREATE POLICY "Admins can create invoices" ON "Invoice"
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "User" 
    WHERE "id" = auth.uid()::text 
    AND "accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF')
  )
);

CREATE POLICY "Admins can update invoices" ON "Invoice"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "User" 
    WHERE "id" = auth.uid()::text 
    AND "accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF')
  )
);

CREATE POLICY "Admins can delete invoices" ON "Invoice"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM "User" 
    WHERE "id" = auth.uid()::text 
    AND "accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF')
  )
);

-- Create RLS policies for InvoiceItem table
CREATE POLICY "Users can view their invoice items" ON "InvoiceItem"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Invoice" 
    WHERE "id" = "InvoiceItem"."invoiceId" 
    AND (
      "userId" = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM "User" 
        WHERE "id" = auth.uid()::text 
        AND "accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF')
      )
    )
  )
);

CREATE POLICY "Admins can create invoice items" ON "InvoiceItem"
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "User" 
    WHERE "id" = auth.uid()::text 
    AND "accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF')
  )
);

CREATE POLICY "Admins can update invoice items" ON "InvoiceItem"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "User" 
    WHERE "id" = auth.uid()::text 
    AND "accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF')
  )
);

CREATE POLICY "Admins can delete invoice items" ON "InvoiceItem"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM "User" 
    WHERE "id" = auth.uid()::text 
    AND "accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF')
  )
);

-- Grant necessary permissions
GRANT ALL ON "Invoice" TO postgres, anon, authenticated, service_role;
GRANT ALL ON "InvoiceItem" TO postgres, anon, authenticated, service_role;

SELECT 'Invoice tables created successfully!' as result;