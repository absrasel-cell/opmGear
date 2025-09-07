-- Fix Supabase service role permissions for conversation storage
-- This ensures the service role can bypass RLS and access all tables

-- Grant superuser-like privileges to service_role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Specifically ensure service_role can bypass RLS
ALTER USER service_role WITH BYPASSRLS;

-- Make sure service_role is in the right role hierarchy
GRANT postgres TO service_role;

-- Double-check permissions on specific tables causing issues
GRANT ALL ON "Conversation" TO service_role WITH GRANT OPTION;
GRANT ALL ON "ConversationMessage" TO service_role WITH GRANT OPTION;
GRANT ALL ON "ConversationQuotes" TO service_role WITH GRANT OPTION;
GRANT ALL ON "QuoteOrder" TO service_role WITH GRANT OPTION;
GRANT ALL ON "QuoteOrderFile" TO service_role WITH GRANT OPTION;

-- Ensure authenticated role also has necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;