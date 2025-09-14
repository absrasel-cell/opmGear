#!/usr/bin/env tsx

// ============================================================================
// US Custom Cap - Pricing Schema Setup Script
// Applies the complete pricing schema to Supabase
// ============================================================================

import { supabaseAdmin } from '../src/lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

async function readSchemaFile(): Promise<string> {
  const schemaPath = path.join(process.cwd(), 'src/lib/pricing/supabase-schema.sql')

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`)
  }

  return fs.readFileSync(schemaPath, 'utf-8')
}

async function setupPricingSchema(): Promise<void> {
  try {
    console.log('🚀 US Custom Cap - Pricing Schema Setup')
    console.log('='.repeat(60))

    // Read the schema file
    console.log('📄 Reading schema file...')
    const schemaSql = await readSchemaFile()

    // Split SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📊 Found ${statements.length} SQL statements to execute`)

    // Execute each statement
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: statement + ';'
        })

        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') ||
              error.message.includes('does not exist')) {
            console.log(`⚠️  Statement ${i + 1}: ${error.message} (continuing...)`)
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message)
            errorCount++
          }
        } else {
          successCount++
        }
      } catch (err) {
        console.error(`💥 Statement ${i + 1} exception:`, err)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 SCHEMA SETUP SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Successful statements: ${successCount}`)
    console.log(`❌ Failed statements: ${errorCount}`)
    console.log(`📈 Total statements: ${statements.length}`)

    if (errorCount === 0) {
      console.log('\n🎉 Schema setup completed successfully!')
      console.log('\n🎯 Next steps:')
      console.log('• Run: npm run migrate:csv:validate (test migration)')
      console.log('• Run: npm run migrate:csv (full migration)')
    } else {
      console.log('\n⚠️ Some statements failed. Check the errors above.')
      console.log('This may be normal if the schema already exists.')
    }

  } catch (error) {
    console.error('💥 Schema setup failed:', error)
    process.exit(1)
  }
}

// Alternative method using direct SQL execution
async function setupPricingSchemaAlternative(): Promise<void> {
  try {
    console.log('🚀 Alternative Setup: Using direct SQL execution')

    const schemaSql = await readSchemaFile()

    // Try to execute the entire schema at once
    const { error } = await supabaseAdmin
      .from('_migration_temp')
      .select('*')
      .limit(1)

    // If we can connect, try executing via SQL
    if (!error || error.message.includes('does not exist')) {
      console.log('✅ Database connection successful')
      console.log('💡 Please run the schema SQL manually in your Supabase SQL editor:')
      console.log('   1. Go to your Supabase dashboard')
      console.log('   2. Navigate to SQL Editor')
      console.log('   3. Copy and paste the contents of: src/lib/pricing/supabase-schema.sql')
      console.log('   4. Execute the SQL')
      console.log('   5. Then run: npm run migrate:csv')
    }

  } catch (error) {
    console.error('❌ Alternative setup failed:', error)
    throw error
  }
}

async function checkSchemaExists(): Promise<boolean> {
  try {
    // Try to query one of our tables to see if schema exists
    const { error } = await supabaseAdmin
      .from('pricing_tiers')
      .select('count', { count: 'exact', head: true })

    return !error
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  try {
    console.log('🔍 Checking if pricing schema already exists...')

    const schemaExists = await checkSchemaExists()

    if (schemaExists) {
      console.log('✅ Pricing schema already exists!')
      console.log('🎯 You can now run: npm run migrate:csv')
      return
    }

    console.log('📋 Pricing schema not found. Setting up...')

    // Try the main setup method
    try {
      await setupPricingSchema()
    } catch (error) {
      console.log('\n⚠️ Primary setup method failed. Trying alternative...')
      await setupPricingSchemaAlternative()
    }

  } catch (error) {
    console.error('💥 Setup script failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}