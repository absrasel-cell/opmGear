-- Row Level Security Policies for Core Conversation Tables
-- US Custom Cap Platform - Conversation Management
-- Author: Claude Code Assistant  
-- Date: 2025-09-05

-- Enable RLS on core conversation tables
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMessage" ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Conversation Table Policies (Enhanced)
-- =====================================================================

-- Drop existing policies to recreate with better support
DROP POLICY IF EXISTS "Users can view own conversations" ON "Conversation";
DROP POLICY IF EXISTS "Users can insert own conversations" ON "Conversation";
DROP POLICY IF EXISTS "Users can update own conversations" ON "Conversation";
DROP POLICY IF EXISTS "Users can delete own conversations" ON "Conversation";

-- Policy: Users can view their own conversations
CREATE POLICY "Users can view own conversations" ON "Conversation"
    FOR SELECT USING (
        "userId" = auth.uid()::text
        OR
        -- Allow viewing conversations with matching sessionId for guest continuation
        (
            "userId" IS NULL 
            AND "sessionId" IN (
                SELECT DISTINCT c2."sessionId" 
                FROM "Conversation" c2 
                WHERE c2."userId" = auth.uid()::text
            )
        )
    );

-- Policy: Users can insert their own conversations
CREATE POLICY "Users can insert own conversations" ON "Conversation"
    FOR INSERT WITH CHECK (
        "userId" = auth.uid()::text
        OR
        -- Allow creating conversations without userId for guest sessions
        ("userId" IS NULL AND "sessionId" IS NOT NULL)
    );

-- Policy: Users can update their own conversations
CREATE POLICY "Users can update own conversations" ON "Conversation"
    FOR UPDATE USING (
        "userId" = auth.uid()::text
        OR
        (
            "userId" IS NULL 
            AND "sessionId" IN (
                SELECT DISTINCT c2."sessionId" 
                FROM "Conversation" c2 
                WHERE c2."userId" = auth.uid()::text
            )
        )
    ) WITH CHECK (
        "userId" = auth.uid()::text
        OR
        (
            "userId" IS NULL 
            AND "sessionId" IN (
                SELECT DISTINCT c2."sessionId" 
                FROM "Conversation" c2 
                WHERE c2."userId" = auth.uid()::text
            )
        )
    );

-- Policy: Users can delete their own conversations
CREATE POLICY "Users can delete own conversations" ON "Conversation"
    FOR DELETE USING (
        "userId" = auth.uid()::text
    );

-- Policy: Admins can manage all conversations
CREATE POLICY "Admins can manage all conversations" ON "Conversation"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id = auth.uid()::text 
            AND u."accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id = auth.uid()::text 
            AND u."accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- Policy: Staff can view all conversations for support
CREATE POLICY "Staff can view all conversations" ON "Conversation"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id = auth.uid()::text 
            AND u."accessRole" IN ('STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- =====================================================================
-- ConversationMessage Table Policies
-- =====================================================================

-- Policy: Users can view messages in their own conversations
CREATE POLICY "Users can view own conversation messages" ON "ConversationMessage"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c.id = "ConversationMessage"."conversationId" 
            AND (
                c."userId" = auth.uid()::text
                OR
                (
                    c."userId" IS NULL 
                    AND c."sessionId" IN (
                        SELECT DISTINCT c2."sessionId" 
                        FROM "Conversation" c2 
                        WHERE c2."userId" = auth.uid()::text
                    )
                )
            )
        )
    );

-- Policy: Users can insert messages in their own conversations
CREATE POLICY "Users can insert own conversation messages" ON "ConversationMessage"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c.id = "ConversationMessage"."conversationId" 
            AND (
                c."userId" = auth.uid()::text
                OR
                (
                    c."userId" IS NULL 
                    AND c."sessionId" IN (
                        SELECT DISTINCT c2."sessionId" 
                        FROM "Conversation" c2 
                        WHERE c2."userId" = auth.uid()::text
                    )
                )
            )
        )
    );

-- Policy: Users can update their own conversation messages
CREATE POLICY "Users can update own conversation messages" ON "ConversationMessage"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c.id = "ConversationMessage"."conversationId" 
            AND c."userId" = auth.uid()::text
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c.id = "ConversationMessage"."conversationId" 
            AND c."userId" = auth.uid()::text
        )
    );

-- Policy: Users can delete their own conversation messages
CREATE POLICY "Users can delete own conversation messages" ON "ConversationMessage"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c.id = "ConversationMessage"."conversationId" 
            AND c."userId" = auth.uid()::text
        )
    );

-- Policy: Admins can manage all conversation messages
CREATE POLICY "Admins can manage all conversation messages" ON "ConversationMessage"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id = auth.uid()::text 
            AND u."accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id = auth.uid()::text 
            AND u."accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- Policy: Staff can view all conversation messages for support
CREATE POLICY "Staff can view all conversation messages" ON "ConversationMessage"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id = auth.uid()::text 
            AND u."accessRole" IN ('STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- =====================================================================
-- Performance Indexes
-- =====================================================================

-- Optimized indexes for conversation queries
CREATE INDEX IF NOT EXISTS "idx_conversation_user_activity" 
ON "Conversation" ("userId", "lastActivity" DESC) 
WHERE "isArchived" = false;

CREATE INDEX IF NOT EXISTS "idx_conversation_session_lookup" 
ON "Conversation" ("sessionId", "userId") 
WHERE "sessionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_conversation_quotes_active" 
ON "Conversation" ("hasQuote", "quoteCompletedAt" DESC) 
WHERE "hasQuote" = true AND "isArchived" = false;

-- Indexes for conversation messages
CREATE INDEX IF NOT EXISTS "idx_conversationmessage_conversation_created" 
ON "ConversationMessage" ("conversationId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_conversationmessage_role_created" 
ON "ConversationMessage" ("conversationId", "role", "createdAt" DESC);

-- =====================================================================
-- Comments and Documentation
-- =====================================================================

COMMENT ON POLICY "Users can view own conversations" ON "Conversation" IS 
'Allows users to view conversations they own directly or through session matching for guest-to-authenticated user flows.';

COMMENT ON POLICY "Users can view own conversation messages" ON "ConversationMessage" IS 
'Allows users to view messages only in conversations they own, with support for session-based guest access.';

COMMENT ON POLICY "Staff can view all conversations" ON "Conversation" IS 
'Provides read-only access to staff members for customer support without modification rights.';

COMMENT ON POLICY "Admins can manage all conversations" ON "Conversation" IS 
'Full access for SUPER_ADMIN and MASTER_ADMIN roles for system management.';

-- =====================================================================
-- Grant necessary permissions to the authenticated role
-- =====================================================================

-- Ensure authenticated users can access the tables through RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON "Conversation" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ConversationMessage" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ConversationQuotes" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "OrderBuilderState" TO authenticated;

-- Ensure the service role can bypass RLS for admin operations
GRANT ALL ON "Conversation" TO service_role;
GRANT ALL ON "ConversationMessage" TO service_role;
GRANT ALL ON "ConversationQuotes" TO service_role;
GRANT ALL ON "OrderBuilderState" TO service_role;