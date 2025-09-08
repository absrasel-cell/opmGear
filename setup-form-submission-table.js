const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupFormSubmissionTable() {
  try {
    console.log('🚀 Setting up FormSubmission table...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('./create-form-submission-table.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      
      // Try alternative method - split and execute statements individually
      console.log('🔄 Trying alternative method...');
      const statements = sqlContent.split(';').filter(stmt => stmt.trim());
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt) continue;
        
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
        
        if (stmtError) {
          console.error(`Error in statement ${i + 1}:`, stmtError);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    } else {
      console.log('✅ SQL executed successfully:', data);
    }
    
    // Verify the table was created by querying it
    console.log('🔍 Verifying table creation...');
    const { data: tableData, error: tableError } = await supabase
      .from('FormSubmission')
      .select('*')
      .limit(5);
    
    if (tableError) {
      console.error('❌ Error verifying table:', tableError);
      
      // Try creating the table with a simpler approach
      console.log('🔄 Creating table with simpler approach...');
      const createTableSQL = `
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
          "userId" uuid,
          "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.error('❌ Error creating table:', createError);
      } else {
        console.log('✅ Table created successfully with simpler approach');
      }
    } else {
      console.log('✅ Table verification successful!');
      console.log('📊 Current form submissions:', tableData.length);
      if (tableData.length > 0) {
        console.log('Sample record:', tableData[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
setupFormSubmissionTable().then(() => {
  console.log('🎉 Setup complete!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Setup failed:', error);
  process.exit(1);
});