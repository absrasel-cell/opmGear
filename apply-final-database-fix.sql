-- Final Database Schema Fixes for US Custom Cap
-- Apply these fixes to resolve all constraint violations

-- 1. Update MessageRole enum to accept both cases (for backward compatibility)
ALTER TYPE "MessageRole" ADD VALUE IF NOT EXISTS 'user';
ALTER TYPE "MessageRole" ADD VALUE IF NOT EXISTS 'assistant';

-- 2. Set default for OrderBuilderState ID (auto-generate if null)
ALTER TABLE "OrderBuilderState" 
ALTER COLUMN "id" SET DEFAULT ('obs_' || extract(epoch from now()) * 1000 || '_' || substr(md5(random()::text), 1, 9));

-- 3. Set default for ConversationMessage updatedAt
ALTER TABLE "ConversationMessage" 
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- 4. Ensure all existing NULL IDs are fixed
UPDATE "OrderBuilderState" 
SET "id" = ('obs_' || extract(epoch from now()) * 1000 || '_' || substr(md5(random()::text), 1, 9))
WHERE "id" IS NULL;

-- 5. Ensure all existing NULL updatedAt are fixed
UPDATE "ConversationMessage" 
SET "updatedAt" = "createdAt" 
WHERE "updatedAt" IS NULL;

-- 6. Refresh enum cache
REFRESH MATERIALIZED VIEW IF EXISTS pg_enum;

-- Verification queries (uncomment to run)
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MessageRole');
-- SELECT COUNT(*) FROM "OrderBuilderState" WHERE "id" IS NULL;
-- SELECT COUNT(*) FROM "ConversationMessage" WHERE "updatedAt" IS NULL;