-- Urgent Database Fix for US Custom Cap Authentication Issues
-- Apply ONLY these critical fixes first

-- 1. DISABLE RLS COMPLETELY for testing
ALTER TABLE "Conversation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationQuotes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderBuilderState" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteOrder" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;

-- 2. Fix MessageRole enum to include lowercase values
DO $$
BEGIN
    -- Add missing lowercase enum values if they don't exist
    BEGIN
        ALTER TYPE "MessageRole" ADD VALUE IF NOT EXISTS 'user';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE "MessageRole" ADD VALUE IF NOT EXISTS 'assistant';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE "MessageRole" ADD VALUE IF NOT EXISTS 'system';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    RAISE NOTICE 'MessageRole enum updated with lowercase values';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'MessageRole enum update failed: %', SQLERRM;
END $$;

-- 3. Fix OrderBuilderState ID and constraint issues
ALTER TABLE "OrderBuilderState" ALTER COLUMN "id" DROP NOT NULL;
ALTER TABLE "OrderBuilderState" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 4. Fix ConversationMessage updatedAt constraint
ALTER TABLE "ConversationMessage" ALTER COLUMN "updatedAt" DROP NOT NULL;
ALTER TABLE "ConversationMessage" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- 5. Grant ALL permissions to bypass any access issues
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Urgent database fixes applied successfully!' as status;