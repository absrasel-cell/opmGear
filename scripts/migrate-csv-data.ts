#!/usr/bin/env tsx

// ============================================================================
// US Custom Cap - CSV Data Migration Script
// Production-Ready Migration with Error Handling and Rollback
// ============================================================================

import { runFullMigration, runValidationOnly, verifyMigration } from '../src/lib/pricing/csv-migration-service'
import { supabaseAdmin } from '../src/lib/supabase'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Checking database connection...')
    const { data, error } = await supabaseAdmin
      .from('pricing_tiers')
      .select('count', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Database connection failed:', error.message)
      return false
    }

    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection error:', error)
    return false
  }
}

async function checkTablesExist(): Promise<{ exists: boolean; missingTables: string[] }> {
  const requiredTables = [
    'pricing_tiers', 'products', 'logo_methods', 'mold_charges',
    'premium_fabrics', 'premium_closures', 'accessories', 'delivery_methods'
  ]

  const missingTables: string[] = []

  for (const table of requiredTables) {
    try {
      const { error } = await supabaseAdmin
        .from(table)
        .select('count', { count: 'exact', head: true })

      if (error) {
        missingTables.push(table)
      }
    } catch (error) {
      missingTables.push(table)
    }
  }

  return {
    exists: missingTables.length === 0,
    missingTables
  }
}

async function createDatabaseBackup(): Promise<{ success: boolean; backupInfo?: any }> {
  try {
    console.log('📦 Creating database backup before migration...')

    const tables = ['pricing_tiers', 'products', 'logo_methods', 'mold_charges',
                   'premium_fabrics', 'premium_closures', 'accessories', 'delivery_methods']

    const backupData: Record<string, any[]> = {}

    for (const table of tables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')

      if (error) {
        console.warn(`⚠️ Could not backup ${table}: ${error.message}`)
        backupData[table] = []
      } else {
        backupData[table] = data || []
      }
    }

    const backupInfo = {
      timestamp: new Date().toISOString(),
      tables: Object.keys(backupData),
      recordCounts: Object.fromEntries(
        Object.entries(backupData).map(([table, data]) => [table, data.length])
      )
    }

    console.log('✅ Backup created successfully')
    console.log('📊 Backup summary:', backupInfo.recordCounts)

    return { success: true, backupInfo }
  } catch (error) {
    console.error('❌ Backup creation failed:', error)
    return { success: false }
  }
}

async function promptUserConfirmation(): Promise<boolean> {
  console.log('\n' + '='.repeat(80))
  console.log('⚠️  IMPORTANT: This will overwrite existing pricing data')
  console.log('='.repeat(80))
  console.log('This migration will:')
  console.log('• Migrate all CSV pricing data to Supabase')
  console.log('• Overwrite existing records with matching names/keys')
  console.log('• Create relationships between products and pricing tiers')
  console.log('• Populate search-optimized fields and tags')
  console.log('='.repeat(80))

  const answer = await askQuestion('\nDo you want to proceed? (yes/no): ')
  return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y'
}

async function selectMigrationMode(): Promise<'full' | 'validate' | 'verify' | 'exit'> {
  console.log('\n📋 Migration Options:')
  console.log('1. Full Migration - Migrate all CSV data to database')
  console.log('2. Validation Only - Test migration without writing to database')
  console.log('3. Verify Existing - Check integrity of existing data')
  console.log('4. Exit')

  const choice = await askQuestion('\nSelect option (1-4): ')

  switch (choice) {
    case '1': return 'full'
    case '2': return 'validate'
    case '3': return 'verify'
    case '4': return 'exit'
    default:
      console.log('❌ Invalid choice. Please select 1-4.')
      return await selectMigrationMode()
  }
}

async function runMigration(): Promise<void> {
  try {
    console.log('🚀 US Custom Cap - CSV Data Migration Script')
    console.log('Production-Ready Migration with Error Handling')
    console.log('='.repeat(80))

    // Step 1: Check database connection
    const connected = await checkDatabaseConnection()
    if (!connected) {
      console.error('❌ Cannot proceed without database connection')
      process.exit(1)
    }

    // Step 2: Check if required tables exist
    const { exists, missingTables } = await checkTablesExist()
    if (!exists) {
      console.error('❌ Missing required tables:', missingTables.join(', '))
      console.log('💡 Please run the schema setup script first:')
      console.log('   npm run setup:schema')
      process.exit(1)
    }

    console.log('✅ All required tables exist')

    // Step 3: Select migration mode
    const mode = await selectMigrationMode()

    if (mode === 'exit') {
      console.log('👋 Migration cancelled by user')
      process.exit(0)
    }

    if (mode === 'verify') {
      console.log('\n🔍 Verifying existing data integrity...')
      const verification = await verifyMigration({ verbose: true })

      if (verification.success) {
        console.log('✅ Data integrity verification passed')
      } else {
        console.log('❌ Data integrity issues found:', verification.issues)
      }

      process.exit(verification.success ? 0 : 1)
    }

    // Step 4: Create backup for full migration
    if (mode === 'full') {
      const backup = await createDatabaseBackup()
      if (!backup.success) {
        const proceed = await askQuestion('⚠️ Backup failed. Continue anyway? (yes/no): ')
        if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
          console.log('❌ Migration cancelled due to backup failure')
          process.exit(1)
        }
      }

      // Step 5: Get user confirmation for full migration
      const confirmed = await promptUserConfirmation()
      if (!confirmed) {
        console.log('❌ Migration cancelled by user')
        process.exit(0)
      }
    }

    // Step 6: Run the migration
    console.log(`\n🚀 Starting ${mode === 'full' ? 'full migration' : 'validation'}...`)

    const migrationConfig = {
      csvBasePath: process.cwd(),
      batchSize: 100,
      skipExisting: false,
      validateOnly: mode === 'validate',
      verbose: true
    }

    const result = mode === 'full'
      ? await runFullMigration(migrationConfig)
      : await runValidationOnly(migrationConfig)

    // Step 7: Post-migration verification for full migration
    if (mode === 'full' && result.success) {
      console.log('\n🔍 Running post-migration verification...')
      const verification = await verifyMigration({ verbose: true })

      if (!verification.success) {
        console.error('❌ Post-migration verification failed!')
        console.error('Issues:', verification.issues)
        process.exit(1)
      }

      console.log('✅ Post-migration verification passed')
    }

    // Step 8: Final summary
    console.log('\n' + '='.repeat(80))
    console.log(`🎉 ${mode === 'full' ? 'MIGRATION' : 'VALIDATION'} COMPLETED SUCCESSFULLY`)
    console.log('='.repeat(80))
    console.log(`📊 Total Records Processed: ${result.totalProcessed}`)
    if (mode === 'full') {
      console.log(`✅ Records Successfully Migrated: ${result.totalInserted}`)
    }
    console.log(`❌ Errors Encountered: ${result.totalErrors}`)
    console.log(`⏱️ Total Execution Time: ${(result.executionTimeMs / 1000).toFixed(2)}s`)

    if (result.totalErrors > 0) {
      console.log('\n⚠️ Some errors occurred during migration. Check the output above for details.')
      process.exit(1)
    }

    if (mode === 'full') {
      console.log('\n🎯 Next Steps:')
      console.log('• Test the pricing system in the application')
      console.log('• Verify AI pricing responses')
      console.log('• Update any hardcoded pricing references')
      console.log('• Monitor application logs for any pricing-related issues')
    }

  } catch (error) {
    console.error('💥 Migration script failed:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n⚠️ Migration interrupted by user')
  rl.close()
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('\n⚠️ Migration terminated')
  rl.close()
  process.exit(1)
})

// Run the migration
if (require.main === module) {
  runMigration().catch((error) => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
  })
}

export { runMigration }