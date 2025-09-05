-- Row Level Security Policies for Enhanced Conversation History System
-- US Custom Cap Platform - Conversation Quote Management
-- Author: Claude Code Assistant
-- Date: 2025-09-05

-- Enable RLS on new tables
ALTER TABLE "ConversationQuotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderBuilderState" ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- ConversationQuotes Table Policies
-- =====================================================================

-- Policy: Users can view their own conversation quotes
CREATE POLICY "Users can view own conversation quotes" ON "ConversationQuotes"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c.id = "ConversationQuotes"."conversationId" 
            AND c."userId" = auth.uid()::text
        )
    );

-- Policy: Users can insert quotes for their own conversations
CREATE POLICY "Users can insert quotes for own conversations" ON "ConversationQuotes"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c.id = "ConversationQuotes"."conversationId" 
            AND c."userId" = auth.uid()::text
        )
    );

-- Policy: Users can update their own conversation quotes
CREATE POLICY "Users can update own conversation quotes" ON "ConversationQuotes"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c.id = "ConversationQuotes"."conversationId" 
            AND c."userId" = auth.uid()::text
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c.id = "ConversationQuotes"."conversationId" 
            AND c."userId" = auth.uid()::text
        )
    );

-- Policy: Users can delete their own conversation quotes
CREATE POLICY "Users can delete own conversation quotes" ON "ConversationQuotes"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c.id = "ConversationQuotes"."conversationId" 
            AND c."userId" = auth.uid()::text
        )
    );

-- Policy: Admins can manage all conversation quotes
CREATE POLICY "Admins can manage all conversation quotes" ON "ConversationQuotes"
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

-- =====================================================================
-- OrderBuilderState Table Policies
-- =====================================================================

-- Policy: Users can view their own order builder states
CREATE POLICY "Users can view own order builder states" ON "OrderBuilderState"
    FOR SELECT USING (
        -- Check if user owns the related conversation
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c."orderBuilderStateId" = "OrderBuilderState".id 
            AND c."userId" = auth.uid()::text
        )
        OR
        -- Check if the state belongs to a quote order owned by the user
        EXISTS (
            SELECT 1 FROM "QuoteOrder" qo
            WHERE qo."sessionId" = "OrderBuilderState"."sessionId"
            AND qo."assignedToId" = auth.uid()::text
        )
        OR
        -- Allow if user matches the session in a generic way (for guest users)
        -- This is more permissive but necessary for the Order Builder flow
        "OrderBuilderState"."sessionId" IN (
            SELECT DISTINCT c."sessionId" FROM "Conversation" c 
            WHERE c."userId" = auth.uid()::text
        )
    );

-- Policy: Users can insert their own order builder states
CREATE POLICY "Users can insert own order builder states" ON "OrderBuilderState"
    FOR INSERT WITH CHECK (
        -- Must be associated with a conversation owned by the user
        -- OR be for a quote order assigned to the user
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c."sessionId" = "OrderBuilderState"."sessionId" 
            AND c."userId" = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM "QuoteOrder" qo
            WHERE qo."sessionId" = "OrderBuilderState"."sessionId"
            AND (qo."assignedToId" = auth.uid()::text OR qo."assignedToId" IS NULL)
        )
    );

-- Policy: Users can update their own order builder states
CREATE POLICY "Users can update own order builder states" ON "OrderBuilderState"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c."orderBuilderStateId" = "OrderBuilderState".id 
            AND c."userId" = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM "QuoteOrder" qo
            WHERE qo."sessionId" = "OrderBuilderState"."sessionId"
            AND qo."assignedToId" = auth.uid()::text
        )
        OR
        "OrderBuilderState"."sessionId" IN (
            SELECT DISTINCT c."sessionId" FROM "Conversation" c 
            WHERE c."userId" = auth.uid()::text
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c."orderBuilderStateId" = "OrderBuilderState".id 
            AND c."userId" = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM "QuoteOrder" qo
            WHERE qo."sessionId" = "OrderBuilderState"."sessionId"
            AND qo."assignedToId" = auth.uid()::text
        )
        OR
        "OrderBuilderState"."sessionId" IN (
            SELECT DISTINCT c."sessionId" FROM "Conversation" c 
            WHERE c."userId" = auth.uid()::text
        )
    );

-- Policy: Users can delete their own order builder states
CREATE POLICY "Users can delete own order builder states" ON "OrderBuilderState"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "Conversation" c 
            WHERE c."orderBuilderStateId" = "OrderBuilderState".id 
            AND c."userId" = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM "QuoteOrder" qo
            WHERE qo."sessionId" = "OrderBuilderState"."sessionId"
            AND qo."assignedToId" = auth.uid()::text
        )
        OR
        "OrderBuilderState"."sessionId" IN (
            SELECT DISTINCT c."sessionId" FROM "Conversation" c 
            WHERE c."userId" = auth.uid()::text
        )
    );

-- Policy: Admins can manage all order builder states
CREATE POLICY "Admins can manage all order builder states" ON "OrderBuilderState"
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

-- Policy: Staff can view all order builder states for support purposes
CREATE POLICY "Staff can view all order builder states" ON "OrderBuilderState"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id = auth.uid()::text 
            AND u."accessRole" IN ('STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- =====================================================================
-- Updated Policies for Existing Tables
-- =====================================================================

-- Update Conversation table policies to handle new quote-related fields
DROP POLICY IF EXISTS "Users can view own conversations" ON "Conversation";
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

DROP POLICY IF EXISTS "Users can update own conversations" ON "Conversation";
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

-- Update QuoteOrder policies to work with conversation system
DROP POLICY IF EXISTS "Users can view assigned quote orders" ON "QuoteOrder";
CREATE POLICY "Users can view assigned quote orders" ON "QuoteOrder"
    FOR SELECT USING (
        "assignedToId" = auth.uid()::text
        OR
        -- Allow viewing quote orders that are linked to user's conversations
        id IN (
            SELECT cq."quoteOrderId" 
            FROM "ConversationQuotes" cq
            JOIN "Conversation" c ON c.id = cq."conversationId"
            WHERE c."userId" = auth.uid()::text
        )
    );

-- =====================================================================
-- Indexes for Performance
-- =====================================================================

-- Indexes for ConversationQuotes table
CREATE INDEX IF NOT EXISTS "idx_conversationquotes_conversation_user" 
ON "ConversationQuotes" ("conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_conversationquotes_quote_lookup" 
ON "ConversationQuotes" ("quoteOrderId", "isMainQuote");

-- Indexes for OrderBuilderState table  
CREATE INDEX IF NOT EXISTS "idx_orderbuilderstate_session_completion" 
ON "OrderBuilderState" ("sessionId", "isCompleted", "completedAt");

CREATE INDEX IF NOT EXISTS "idx_orderbuilderstate_user_lookup" 
ON "OrderBuilderState" ("sessionId", "updatedAt");

CREATE INDEX IF NOT EXISTS "idx_orderbuilderstate_restoration_tracking" 
ON "OrderBuilderState" ("lastRestoredAt", "restorationCount") 
WHERE "isCompleted" = true;

-- =====================================================================
-- Performance and Security Comments
-- =====================================================================

COMMENT ON POLICY "Users can view own conversation quotes" ON "ConversationQuotes" IS 
'Allows users to view quotes associated with their own conversations only. Uses JOIN with Conversation table to enforce ownership.';

COMMENT ON POLICY "Admins can manage all conversation quotes" ON "ConversationQuotes" IS 
'Provides full access to SUPER_ADMIN and MASTER_ADMIN roles for system management and support purposes.';

COMMENT ON POLICY "Users can view own order builder states" ON "OrderBuilderState" IS 
'Complex policy allowing state access through conversation ownership, quote assignment, or session matching. Supports both authenticated and guest-to-authenticated user flows.';

COMMENT ON POLICY "Staff can view all order builder states" ON "OrderBuilderState" IS 
'Read-only access for staff members to provide customer support without modification rights.';

-- =====================================================================
-- Verification Queries (for testing)
-- =====================================================================

-- Test query to verify ConversationQuotes access
-- SELECT cq.*, c."userId", c.title 
-- FROM "ConversationQuotes" cq
-- JOIN "Conversation" c ON c.id = cq."conversationId"
-- WHERE c."userId" = 'test-user-id';

-- Test query to verify OrderBuilderState access
-- SELECT obs.*, c."userId" 
-- FROM "OrderBuilderState" obs
-- LEFT JOIN "Conversation" c ON c."orderBuilderStateId" = obs.id
-- WHERE obs."sessionId" = 'test-session-id';

-- Performance test for conversation loading with quotes
-- SELECT c.*, cq."quoteOrderId", obs."totalCost"
-- FROM "Conversation" c
-- LEFT JOIN "ConversationQuotes" cq ON cq."conversationId" = c.id AND cq."isMainQuote" = true
-- LEFT JOIN "OrderBuilderState" obs ON obs.id = c."orderBuilderStateId"
-- WHERE c."userId" = 'test-user-id' AND c."hasQuote" = true
-- ORDER BY c."quoteCompletedAt" DESC;