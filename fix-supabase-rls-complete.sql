-- Complete RLS fix for Supabase - Drop all policies and disable RLS entirely
-- This ensures service_role can access tables without any permission issues

-- Drop all existing RLS policies first
DROP POLICY IF EXISTS "Users can view own conversations" ON "Conversation";
DROP POLICY IF EXISTS "Users can insert own conversations" ON "Conversation";
DROP POLICY IF EXISTS "Users can update own conversations" ON "Conversation";
DROP POLICY IF EXISTS "Users can delete own conversations" ON "Conversation";
DROP POLICY IF EXISTS "Admins can manage all conversations" ON "Conversation";
DROP POLICY IF EXISTS "Staff can view all conversations" ON "Conversation";

DROP POLICY IF EXISTS "Users can view own conversation messages" ON "ConversationMessage";
DROP POLICY IF EXISTS "Users can insert own conversation messages" ON "ConversationMessage";
DROP POLICY IF EXISTS "Users can update own conversation messages" ON "ConversationMessage";
DROP POLICY IF EXISTS "Users can delete own conversation messages" ON "ConversationMessage";
DROP POLICY IF EXISTS "Admins can manage all conversation messages" ON "ConversationMessage";
DROP POLICY IF EXISTS "Staff can view all conversation messages" ON "ConversationMessage";

-- Completely disable RLS on all conversation-related tables
ALTER TABLE "Conversation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationQuotes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderBuilderState" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteOrder" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteOrderFile" DISABLE ROW LEVEL SECURITY;

-- Also disable on other problematic tables
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Cart" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "FormSubmission" DISABLE ROW LEVEL SECURITY;

-- Grant full access to all roles that need it
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;

-- Grant sequence access
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant function access
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Ensure schema access
GRANT ALL PRIVILEGES ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON SCHEMA public TO anon;