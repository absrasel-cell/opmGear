import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
 try {
  // Create a simple test table
  const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
     CREATE TABLE IF NOT EXISTS test_table (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     )
    `
  });

  if (createError) {
    console.error('Error creating test table:', createError);
    return NextResponse.json(
      { success: false, error: createError.message },
      { status: 500 }
    );
  }
  
  // Check if table was created
  const { data: tables, error: queryError } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
     SELECT table_name 
     FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_type = 'BASE TABLE'
     ORDER BY table_name
    `
  });

  if (queryError) {
    console.error('Error querying tables:', queryError);
    return NextResponse.json(
      { success: false, error: queryError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
   success: true,
   tables,
   message: 'Test table created',
  });
 } catch (error: any) {
  console.error('Create test table error:', error);
  return NextResponse.json(
   { 
    success: false, 
    error: error.message,
    code: error.code,
   },
   { status: 500 }
  );
 }
}
