-- =====================================================================
-- Create FormSubmission table for Contact Forms and Modal Quote Forms
-- Date: 2025-09-08
-- =====================================================================

-- Create FormSubmission table
CREATE TABLE IF NOT EXISTS "FormSubmission" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "formType" text NOT NULL DEFAULT 'CONTACT',
    "name" text NOT NULL,
    "email" text NOT NULL,
    "subject" text,
    "message" text NOT NULL,
    "phone" text,
    "company" text,
    "status" text NOT NULL DEFAULT 'NEW',
    "priority" text NOT NULL DEFAULT 'NORMAL',
    "resolved" boolean NOT NULL DEFAULT false,
    "metadata" jsonb DEFAULT '{}',
    "ipAddress" text,
    "userAgent" text,
    "referrer" text,
    "userId" uuid REFERENCES "User"(id) ON DELETE SET NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_form_submission_type_status" ON "FormSubmission" ("formType", "status");
CREATE INDEX IF NOT EXISTS "idx_form_submission_created_at" ON "FormSubmission" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_form_submission_email" ON "FormSubmission" ("email");
CREATE INDEX IF NOT EXISTS "idx_form_submission_priority" ON "FormSubmission" ("priority");
CREATE INDEX IF NOT EXISTS "idx_form_submission_resolved" ON "FormSubmission" ("resolved");

-- Create trigger to automatically update updatedAt
CREATE OR REPLACE FUNCTION update_form_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_form_submission_updated_at ON "FormSubmission";
CREATE TRIGGER update_form_submission_updated_at
    BEFORE UPDATE ON "FormSubmission"
    FOR EACH ROW
    EXECUTE FUNCTION update_form_submission_updated_at();

-- Set up RLS (Row Level Security)
ALTER TABLE "FormSubmission" ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can see all form submissions
CREATE POLICY "admin_can_manage_all_form_submissions" ON "FormSubmission"
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM "User" u 
        WHERE u.id = auth.uid()::text 
        AND u."accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'ADMIN', 'STAFF')
    )
);

-- Policy: Users can see their own submissions (if authenticated)
CREATE POLICY "users_can_view_own_submissions" ON "FormSubmission"
FOR SELECT USING (
    auth.uid()::text = "userId"
);

-- Policy: Allow anonymous users to create submissions (for contact forms)
CREATE POLICY "allow_anonymous_insert" ON "FormSubmission"
FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL PRIVILEGES ON "FormSubmission" TO service_role;
GRANT SELECT, INSERT, UPDATE ON "FormSubmission" TO authenticated;
GRANT INSERT ON "FormSubmission" TO anon;

-- Add some test data to verify table structure
INSERT INTO "FormSubmission" (
    "formType",
    "name", 
    "email",
    "subject",
    "message",
    "phone",
    "company",
    "metadata"
) VALUES (
    'CONTACT',
    'Test User',
    'test@example.com',
    'Test Subject',
    'This is a test message to verify the form submission system is working.',
    '+1234567890',
    'Test Company',
    '{"source": "test", "test": true}'::jsonb
);

-- Summary
SELECT 'FormSubmission table created successfully!' as status;