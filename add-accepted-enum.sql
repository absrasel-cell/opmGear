-- Add ACCEPTED status to QuoteOrderStatus enum
-- This allows quotes to be marked as accepted by users

-- Add ACCEPTED to QuoteOrderStatus enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ACCEPTED' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'QuoteOrderStatus'
        )
    ) THEN
        ALTER TYPE "QuoteOrderStatus" ADD VALUE 'ACCEPTED';
        RAISE NOTICE 'Added ACCEPTED to QuoteOrderStatus enum';
    ELSE
        RAISE NOTICE 'ACCEPTED already exists in QuoteOrderStatus enum';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Failed to add ACCEPTED to enum: %', SQLERRM;
END $$;