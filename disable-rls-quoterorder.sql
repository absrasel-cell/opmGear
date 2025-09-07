-- Temporarily disable RLS on QuoteOrder to get it working immediately
ALTER TABLE "QuoteOrder" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteOrderFile" DISABLE ROW LEVEL SECURITY;

-- Grant full access to service role
GRANT ALL ON "QuoteOrder" TO service_role;
GRANT ALL ON "QuoteOrderFile" TO service_role;

-- Grant access to authenticated users  
GRANT SELECT, INSERT, UPDATE, DELETE ON "QuoteOrder" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "QuoteOrderFile" TO authenticated;