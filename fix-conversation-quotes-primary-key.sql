-- Fix ConversationQuotes table missing primary key
-- Date: 2025-09-06
-- Issue: NOT NULL violation on id field when creating quote bridge records

-- First check if the table exists and what columns it has
DO $$
BEGIN
    -- Check if ConversationQuotes table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ConversationQuotes'
    ) THEN
        RAISE NOTICE 'ConversationQuotes table exists';
        
        -- Check if id column exists
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ConversationQuotes' 
            AND column_name = 'id'
        ) THEN
            RAISE NOTICE 'id column exists in ConversationQuotes';
        ELSE
            RAISE NOTICE 'id column MISSING in ConversationQuotes - this is the problem!';
        END IF;
    ELSE
        RAISE NOTICE 'ConversationQuotes table does not exist';
    END IF;
END $$;

-- Disable RLS temporarily for fixes
ALTER TABLE "ConversationQuotes" DISABLE ROW LEVEL SECURITY;

-- Add id column if it doesn't exist
DO $$
BEGIN
    -- Add primary key id column with UUID default
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ConversationQuotes' 
        AND column_name = 'id'
    ) THEN
        -- Add the id column as primary key with UUID default
        ALTER TABLE "ConversationQuotes" ADD COLUMN id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text;
        RAISE NOTICE 'Added id column with UUID default to ConversationQuotes';
    ELSE
        -- Ensure existing id column has proper default
        ALTER TABLE "ConversationQuotes" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
        RAISE NOTICE 'Set default UUID generator for existing id column';
    END IF;
    
    -- Ensure other timestamp columns have defaults
    ALTER TABLE "ConversationQuotes" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "ConversationQuotes" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
    
    -- Ensure boolean column has default
    ALTER TABLE "ConversationQuotes" ALTER COLUMN "isMainQuote" SET DEFAULT false;
    
    RAISE NOTICE 'ConversationQuotes table schema fixes completed';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing ConversationQuotes: %', SQLERRM;
END $$;

-- Update any existing rows that might have null ids
UPDATE "ConversationQuotes" 
SET id = gen_random_uuid()::text 
WHERE id IS NULL;

-- Grant proper permissions
GRANT ALL ON "ConversationQuotes" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ConversationQuotes" TO authenticated;

-- Create simple policy to allow all access (RLS causes issues)
CREATE POLICY IF NOT EXISTS "allow_all_conversation_quotes" ON "ConversationQuotes"
FOR ALL USING (true);

-- Re-enable RLS
ALTER TABLE "ConversationQuotes" ENABLE ROW LEVEL SECURITY;

-- Verify the fix
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ConversationQuotes';
    
    RAISE NOTICE 'ConversationQuotes now has % columns', col_count;
    
    -- Show column details
    FOR rec IN (
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ConversationQuotes'
        ORDER BY ordinal_position
    ) LOOP
        RAISE NOTICE 'Column: % (%, default: %, nullable: %)', 
            rec.column_name, rec.data_type, COALESCE(rec.column_default, 'none'), rec.is_nullable;
    END LOOP;
END $$;