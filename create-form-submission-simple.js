const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createFormSubmissionTable() {
  console.log('🚀 Checking FormSubmission table...');
  
  // First check if table already exists by trying to query it
  const { data: existingData, error: existingError } = await supabase
    .from('FormSubmission')
    .select('*')
    .limit(1);
  
  if (!existingError) {
    console.log('✅ FormSubmission table already exists!');
    console.log('📊 Current submissions count:', existingData ? existingData.length : 0);
    return true;
  }
  
  console.log('❌ Table does not exist. Error:', existingError.message);
  
  // We can't create the table directly through Supabase client
  // The user needs to create it via the Supabase dashboard or SQL editor
  console.log(`
🚨 FormSubmission table does not exist in the database!

To fix this issue, you need to:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/projects
2. Select your project
3. Go to "SQL Editor"
4. Execute this SQL:

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

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_form_submission_type_status" ON "FormSubmission" ("formType", "status");
CREATE INDEX IF NOT EXISTS "idx_form_submission_created_at" ON "FormSubmission" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_form_submission_email" ON "FormSubmission" ("email");

-- Enable RLS
ALTER TABLE "FormSubmission" ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_access" ON "FormSubmission" FOR ALL USING (auth.role() = 'service_role');

-- Allow anonymous users to insert (for contact forms)
CREATE POLICY "allow_anonymous_insert" ON "FormSubmission" FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view their own submissions
CREATE POLICY "users_can_view_own_submissions" ON "FormSubmission"
FOR SELECT USING (auth.uid()::text = "userId");

-- Allow admin users to see all submissions
CREATE POLICY "admin_can_manage_all_form_submissions" ON "FormSubmission"
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM "User" u 
        WHERE u.id = auth.uid()::text 
        AND u."accessRole" IN ('SUPER_ADMIN', 'MASTER_ADMIN', 'ADMIN', 'STAFF')
    )
);

5. After creating the table, test the contact form again!
`);
  
  return false;
}

createFormSubmissionTable().then((success) => {
  if (success) {
    console.log('🎉 Ready to test form submissions!');
  } else {
    console.log('⚠️  Please create the table manually in Supabase dashboard');
  }
  process.exit(0);
}).catch(console.error);