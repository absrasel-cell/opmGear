-- Comprehensive RLS Fix for US Custom Cap
-- Disable RLS on all problematic tables and grant proper permissions

-- Disable RLS on all core tables that need immediate access
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Cart" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteOrder" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteOrderFile" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationQuotes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderBuilderState" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "FormSubmission" DISABLE ROW LEVEL SECURITY;

-- Grant full access to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;