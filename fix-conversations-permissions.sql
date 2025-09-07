-- Fix conversation storage permissions without modifying reserved roles
-- Focus on table-level permissions for service_role and authenticated

-- Grant explicit table access to service_role (should already exist)
GRANT ALL PRIVILEGES ON "Conversation" TO service_role;
GRANT ALL PRIVILEGES ON "ConversationMessage" TO service_role;
GRANT ALL PRIVILEGES ON "ConversationQuotes" TO service_role;
GRANT ALL PRIVILEGES ON "OrderBuilderState" TO service_role;
GRANT ALL PRIVILEGES ON "QuoteOrder" TO service_role;
GRANT ALL PRIVILEGES ON "QuoteOrderFile" TO service_role;

-- Grant explicit table access to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON "Conversation" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ConversationMessage" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ConversationQuotes" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "OrderBuilderState" TO authenticated;

-- Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Make sure RLS is still disabled on these tables (from previous fix)
ALTER TABLE "Conversation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationQuotes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderBuilderState" DISABLE ROW LEVEL SECURITY;