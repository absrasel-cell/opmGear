import { supabaseAdmin } from '../supabase'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse'

// ============================================================================
// CSV Data Migration Service for US Custom Cap Pricing System
// ============================================================================

export interface MigrationConfig {
  csvBasePath: string
  batchSize: number
  skipExisting: boolean
  validateOnly: boolean
  verbose: boolean
}

export interface MigrationResult {
  table: string
  totalRecords: number
  insertedRecords: number
  skippedRecords: number
  errorRecords: number
  errors: Array<{ row: number; error: string; data?: any }>
}

export interface MigrationSummary {
  success: boolean
  totalProcessed: number
  totalInserted: number
  totalErrors: number
  results: MigrationResult[]
  executionTimeMs: number
}

export class CSVMigrationService {
  private config: MigrationConfig
  private supabase = supabaseAdmin

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = {
      csvBasePath: process.cwd(),
      batchSize: 100,
      skipExisting: false,
      validateOnly: false,
      verbose: true,
      ...config
    }

    if (this.config.verbose) {
      console.log('🚀 CSV Migration Service initialized with config:', this.config)
    }
  }

  // ============================================================================
  // Main Migration Orchestrator
  // ============================================================================

  async migrateAllTables(): Promise<MigrationSummary> {
    const startTime = Date.now()
    const results: MigrationResult[] = []

    try {
      if (this.config.verbose) {
        console.log('📊 Starting comprehensive CSV data migration...')
      }

      // Step 1: Migrate pricing tiers (foundation)
      const pricingTiersResult = await this.migratePricingTiers()
      results.push(pricingTiersResult)

      // Step 2: Migrate products (depends on pricing tiers)
      const productsResult = await this.migrateProducts()
      results.push(productsResult)

      // Step 3: Migrate logo methods and mold charges
      const logoResult = await this.migrateLogoMethods()
      results.push(logoResult)

      const moldResult = await this.migrateMoldCharges()
      results.push(moldResult)

      // Step 4: Migrate premium options
      const fabricsResult = await this.migratePremiumFabrics()
      results.push(fabricsResult)

      const closuresResult = await this.migratePremiumClosures()
      results.push(closuresResult)

      const accessoriesResult = await this.migrateAccessories()
      results.push(accessoriesResult)

      // Step 5: Migrate delivery methods
      const deliveryResult = await this.migrateDeliveryMethods()
      results.push(deliveryResult)

      const executionTimeMs = Date.now() - startTime
      const totalProcessed = results.reduce((sum, r) => sum + r.totalRecords, 0)
      const totalInserted = results.reduce((sum, r) => sum + r.insertedRecords, 0)
      const totalErrors = results.reduce((sum, r) => sum + r.errorRecords, 0)

      const summary: MigrationSummary = {
        success: totalErrors === 0,
        totalProcessed,
        totalInserted,
        totalErrors,
        results,
        executionTimeMs
      }

      if (this.config.verbose) {
        this.printMigrationSummary(summary)
      }

      return summary

    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }

  // ============================================================================
  // Individual Table Migration Methods
  // ============================================================================

  async migratePricingTiers(): Promise<MigrationResult> {
    const csvPath = path.join(this.config.csvBasePath, 'src/app/csv/Blank Cap Pricings.csv')

    if (this.config.verbose) {
      console.log('📋 Migrating pricing tiers from:', csvPath)
    }

    const records = await this.parseCsvFile(csvPath)
    const result: MigrationResult = {
      table: 'pricing_tiers',
      totalRecords: records.length,
      insertedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      errors: []
    }

    for (let i = 0; i < records.length; i++) {
      const record = records[i]

      try {
        const tierData = {
          tier_name: record.Name,
          description: `${record.Name} pricing tier`,
          price_48: parseFloat(record.price48) || 0,
          price_144: parseFloat(record.price144) || 0,
          price_576: parseFloat(record.price576) || 0,
          price_1152: parseFloat(record.price1152) || 0,
          price_2880: parseFloat(record.price2880) || 0,
          price_10000: parseFloat(record.price10000) || 0
        }

        if (!this.config.validateOnly) {
          const { error } = await this.supabase
            .from('pricing_tiers')
            .upsert(tierData, { onConflict: 'tier_name' })

          if (error) {
            result.errors.push({ row: i + 1, error: error.message, data: tierData })
            result.errorRecords++
          } else {
            result.insertedRecords++
          }
        } else {
          result.insertedRecords++
        }

      } catch (error) {
        result.errors.push({ row: i + 1, error: String(error), data: record })
        result.errorRecords++
      }
    }

    return result
  }

  async migrateProducts(): Promise<MigrationResult> {
    const csvPath = path.join(this.config.csvBasePath, 'src/app/csv/Customer Products.csv')

    if (this.config.verbose) {
      console.log('🎯 Migrating products from:', csvPath)
    }

    const records = await this.parseCsvFile(csvPath)
    const result: MigrationResult = {
      table: 'products',
      totalRecords: records.length,
      insertedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      errors: []
    }

    // Get pricing tier mappings
    const { data: pricingTiers } = await this.supabase
      .from('pricing_tiers')
      .select('id, tier_name')

    const tierMap = new Map(pricingTiers?.map(t => [t.tier_name, t.id]) || [])

    for (let i = 0; i < records.length; i++) {
      const record = records[i]

      try {
        const pricingTierId = tierMap.get(record.priceTier)
        if (!pricingTierId) {
          result.errors.push({
            row: i + 1,
            error: `Pricing tier not found: ${record.priceTier}`,
            data: record
          })
          result.errorRecords++
          continue
        }

        // Parse nick names from CSV
        const nickNames = record['Nick Names']
          ? record['Nick Names'].split(',').map((name: string) => name.trim())
          : []

        // Generate product code
        const productCode = record.Name.replace(/\s+/g, '_').toUpperCase()

        // Extract panel count from Panel Count column (e.g., "4-Panel" -> 4)
        const panelCountStr = record['Panel Count'] || ''
        const panelMatch = panelCountStr.match(/(\d+)-Panel/)
        const panelCount = panelMatch ? parseInt(panelMatch[1]) : 5

        const productData = {
          name: record.Name,
          code: productCode,
          profile: record.Profile,
          bill_shape: record['Bill Shape'],
          panel_count: panelCount,
          structure_type: record['Structure Type'],
          pricing_tier_id: pricingTierId,
          nick_names: nickNames,
          tags: {
            profile: record.Profile,
            billShape: record['Bill Shape'],
            structureType: record['Structure Type'],
            panelCount: panelCount,
            searchTerms: nickNames
          },
          is_active: true
        }

        if (!this.config.validateOnly) {
          const { error } = await this.supabase
            .from('products')
            .upsert(productData, { onConflict: 'name' })

          if (error) {
            result.errors.push({ row: i + 1, error: error.message, data: productData })
            result.errorRecords++
          } else {
            result.insertedRecords++
          }
        } else {
          result.insertedRecords++
        }

      } catch (error) {
        result.errors.push({ row: i + 1, error: String(error), data: record })
        result.errorRecords++
      }
    }

    return result
  }

  async migrateLogoMethods(): Promise<MigrationResult> {
    const csvPath = path.join(this.config.csvBasePath, 'src/app/ai/Options/Logo.csv')

    if (this.config.verbose) {
      console.log('🎨 Migrating logo methods from:', csvPath)
    }

    const records = await this.parseCsvFile(csvPath)
    const result: MigrationResult = {
      table: 'logo_methods',
      totalRecords: records.length,
      insertedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      errors: []
    }

    for (let i = 0; i < records.length; i++) {
      const record = records[i]

      try {
        const logoData = {
          name: record.Name,
          application: record.Application,
          size: record.Size,
          size_example: record['Size Example'] || null,
          price_48: parseFloat(record.price48) || 0,
          price_144: parseFloat(record.price144) || 0,
          price_576: parseFloat(record.price576) || 0,
          price_1152: parseFloat(record.price1152) || 0,
          price_2880: parseFloat(record.price2880) || 0,
          price_10000: parseFloat(record.price10000) || 0,
          price_20000: parseFloat(record.price20000) || 0,
          mold_charge_type: record['Mold Charge'] ? `${record.Size} Mold Charge` : null,
          tags: {
            method: record.Name,
            application: record.Application,
            size: record.Size,
            category: 'logo_customization'
          }
        }

        if (!this.config.validateOnly) {
          const { error } = await this.supabase
            .from('logo_methods')
            .upsert(logoData, { onConflict: 'name,application,size' })

          if (error) {
            result.errors.push({ row: i + 1, error: error.message, data: logoData })
            result.errorRecords++
          } else {
            result.insertedRecords++
          }
        } else {
          result.insertedRecords++
        }

      } catch (error) {
        result.errors.push({ row: i + 1, error: String(error), data: record })
        result.errorRecords++
      }
    }

    return result
  }

  async migrateMoldCharges(): Promise<MigrationResult> {
    // Extract mold charges from logo data
    const csvPath = path.join(this.config.csvBasePath, 'src/app/ai/Options/Logo.csv')
    const records = await this.parseCsvFile(csvPath)

    const result: MigrationResult = {
      table: 'mold_charges',
      totalRecords: 0,
      insertedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      errors: []
    }

    // Extract unique size-based mold charges
    const moldCharges = new Map<string, { size: string; size_example: string; charge_amount: number }>()

    for (const record of records) {
      const moldCharge = record['Mold Charge']
      if (moldCharge && moldCharge.trim() !== '') {
        const charge = parseFloat(moldCharge)
        if (!isNaN(charge) && charge > 0) {
          const key = record.Size
          if (!moldCharges.has(key)) {
            moldCharges.set(key, {
              size: record.Size,
              size_example: record['Size Example'] || '',
              charge_amount: charge
            })
          }
        }
      }
    }

    result.totalRecords = moldCharges.size

    for (const [, moldData] of moldCharges) {
      try {
        if (!this.config.validateOnly) {
          const { error } = await this.supabase
            .from('mold_charges')
            .upsert(moldData, { onConflict: 'size' })

          if (error) {
            result.errors.push({ row: result.totalRecords, error: error.message, data: moldData })
            result.errorRecords++
          } else {
            result.insertedRecords++
          }
        } else {
          result.insertedRecords++
        }
      } catch (error) {
        result.errors.push({ row: result.totalRecords, error: String(error), data: moldData })
        result.errorRecords++
      }
    }

    return result
  }

  async migratePremiumFabrics(): Promise<MigrationResult> {
    const csvPath = path.join(this.config.csvBasePath, 'src/app/ai/Options/Fabric.csv')

    if (this.config.verbose) {
      console.log('🧵 Migrating premium fabrics from:', csvPath)
    }

    const records = await this.parseCsvFile(csvPath)
    const result: MigrationResult = {
      table: 'premium_fabrics',
      totalRecords: records.length,
      insertedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      errors: []
    }

    for (let i = 0; i < records.length; i++) {
      const record = records[i]

      try {
        // Parse available colors
        const availableColors = record['Color Note'] && record['Color Note'] !== 'All'
          ? record['Color Note'].split(',').map((color: string) => color.trim())
          : []

        const fabricData = {
          name: record.Name,
          cost_type: record.costType,
          color_note: record['Color Note'] || null,
          price_48: parseFloat(record.price48) || 0,
          price_144: parseFloat(record.price144) || 0,
          price_576: parseFloat(record.price576) || 0,
          price_1152: parseFloat(record.price1152) || 0,
          price_2880: parseFloat(record.price2880) || 0,
          price_10000: parseFloat(record.price10000) || 0,
          available_colors: availableColors,
          tags: {
            costType: record.costType,
            category: 'fabric',
            isPremium: record.costType === 'Premium Fabric'
          }
        }

        if (!this.config.validateOnly) {
          const { error } = await this.supabase
            .from('premium_fabrics')
            .upsert(fabricData, { onConflict: 'name' })

          if (error) {
            result.errors.push({ row: i + 1, error: error.message, data: fabricData })
            result.errorRecords++
          } else {
            result.insertedRecords++
          }
        } else {
          result.insertedRecords++
        }

      } catch (error) {
        result.errors.push({ row: i + 1, error: String(error), data: record })
        result.errorRecords++
      }
    }

    return result
  }

  async migratePremiumClosures(): Promise<MigrationResult> {
    const csvPath = path.join(this.config.csvBasePath, 'src/app/ai/Options/Closure.csv')

    if (this.config.verbose) {
      console.log('🔒 Migrating premium closures from:', csvPath)
    }

    const records = await this.parseCsvFile(csvPath)
    const result: MigrationResult = {
      table: 'premium_closures',
      totalRecords: records.length,
      insertedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      errors: []
    }

    for (let i = 0; i < records.length; i++) {
      const record = records[i]

      try {
        const closureData = {
          name: record.Name,
          closure_type: record.type,
          price_48: parseFloat(record.price48) || 0,
          price_144: parseFloat(record.price144) || 0,
          price_576: parseFloat(record.price576) || 0,
          price_1152: parseFloat(record.price1152) || 0,
          price_2880: parseFloat(record.price2880) || 0,
          price_10000: parseFloat(record.price10000) || 0,
          price_20000: parseFloat(record.price20000) || 0,
          comment: record.Comment || null
        }

        if (!this.config.validateOnly) {
          const { error } = await this.supabase
            .from('premium_closures')
            .upsert(closureData, { onConflict: 'name' })

          if (error) {
            result.errors.push({ row: i + 1, error: error.message, data: closureData })
            result.errorRecords++
          } else {
            result.insertedRecords++
          }
        } else {
          result.insertedRecords++
        }

      } catch (error) {
        result.errors.push({ row: i + 1, error: String(error), data: record })
        result.errorRecords++
      }
    }

    return result
  }

  async migrateAccessories(): Promise<MigrationResult> {
    const csvPath = path.join(this.config.csvBasePath, 'src/app/ai/Options/Accessories.csv')

    if (this.config.verbose) {
      console.log('🏷️ Migrating accessories from:', csvPath)
    }

    const records = await this.parseCsvFile(csvPath)
    const result: MigrationResult = {
      table: 'accessories',
      totalRecords: records.length,
      insertedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      errors: []
    }

    for (let i = 0; i < records.length; i++) {
      const record = records[i]

      try {
        const accessoryData = {
          name: record.Name,
          price_48: parseFloat(record.price48) || 0,
          price_144: parseFloat(record.price144) || 0,
          price_576: parseFloat(record.price576) || 0,
          price_1152: parseFloat(record.price1152) || 0,
          price_2880: parseFloat(record.price2880) || 0,
          price_10000: parseFloat(record.price10000) || 0,
          price_20000: parseFloat(record.price20000) || 0
        }

        if (!this.config.validateOnly) {
          const { error } = await this.supabase
            .from('accessories')
            .upsert(accessoryData, { onConflict: 'name' })

          if (error) {
            result.errors.push({ row: i + 1, error: error.message, data: accessoryData })
            result.errorRecords++
          } else {
            result.insertedRecords++
          }
        } else {
          result.insertedRecords++
        }

      } catch (error) {
        result.errors.push({ row: i + 1, error: String(error), data: record })
        result.errorRecords++
      }
    }

    return result
  }

  async migrateDeliveryMethods(): Promise<MigrationResult> {
    const csvPath = path.join(this.config.csvBasePath, 'src/app/ai/Options/Delivery.csv')

    if (this.config.verbose) {
      console.log('🚚 Migrating delivery methods from:', csvPath)
    }

    const records = await this.parseCsvFile(csvPath)
    const result: MigrationResult = {
      table: 'delivery_methods',
      totalRecords: records.length,
      insertedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      errors: []
    }

    for (let i = 0; i < records.length; i++) {
      const record = records[i]

      try {
        const deliveryData = {
          name: record.Name,
          delivery_type: record.type,
          delivery_days: record['Delivery Days'],
          price_48: this.parsePrice(record.price48),
          price_144: this.parsePrice(record.price144),
          price_576: this.parsePrice(record.price576),
          price_1152: this.parsePrice(record.price1152),
          price_2880: this.parsePrice(record.price2880),
          price_10000: this.parsePrice(record.price10000),
          price_20000: this.parsePrice(record.price20000),
          min_quantity: this.calculateMinQuantity(record)
        }

        if (!this.config.validateOnly) {
          const { error } = await this.supabase
            .from('delivery_methods')
            .upsert(deliveryData, { onConflict: 'name' })

          if (error) {
            result.errors.push({ row: i + 1, error: error.message, data: deliveryData })
            result.errorRecords++
          } else {
            result.insertedRecords++
          }
        } else {
          result.insertedRecords++
        }

      } catch (error) {
        result.errors.push({ row: i + 1, error: String(error), data: record })
        result.errorRecords++
      }
    }

    return result
  }

  // ============================================================================
  // Data Verification Methods
  // ============================================================================

  async verifyMigrationIntegrity(): Promise<{
    success: boolean
    issues: string[]
    statistics: Record<string, number>
  }> {
    const issues: string[] = []
    const statistics: Record<string, number> = {}

    try {
      // Check table counts
      const tables = ['pricing_tiers', 'products', 'logo_methods', 'mold_charges',
                     'premium_fabrics', 'premium_closures', 'accessories', 'delivery_methods']

      for (const table of tables) {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          issues.push(`Failed to count ${table}: ${error.message}`)
          statistics[table] = 0
        } else {
          statistics[table] = count || 0
        }
      }

      // Check pricing tier relationships
      const { data: productsWithoutTiers } = await this.supabase
        .from('products')
        .select('name')
        .is('pricing_tier_id', null)

      if (productsWithoutTiers && productsWithoutTiers.length > 0) {
        issues.push(`${productsWithoutTiers.length} products without pricing tiers`)
      }

      // Check for duplicate names
      for (const table of tables) {
        const { data: duplicates } = await this.supabase
          .from(table)
          .select('name')
          .group('name')
          .having('count(*) > 1')

        if (duplicates && duplicates.length > 0) {
          issues.push(`${duplicates.length} duplicate names in ${table}`)
        }
      }

      if (this.config.verbose) {
        console.log('📊 Migration verification statistics:', statistics)
        if (issues.length > 0) {
          console.log('⚠️ Issues found:', issues)
        } else {
          console.log('✅ Migration integrity verified - no issues found')
        }
      }

      return {
        success: issues.length === 0,
        issues,
        statistics
      }

    } catch (error) {
      issues.push(`Verification failed: ${error}`)
      return { success: false, issues, statistics }
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private async parseCsvFile(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = []

      if (!fs.existsSync(filePath)) {
        reject(new Error(`CSV file not found: ${filePath}`))
        return
      }

      fs.createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (record) => {
          records.push(record)
        })
        .on('end', () => {
          resolve(records)
        })
        .on('error', (error) => {
          reject(error)
        })
    })
  }

  private parsePrice(priceStr: string): number | null {
    if (!priceStr || priceStr.trim() === '' || priceStr.toLowerCase().includes('not applicable')) {
      return null
    }
    const price = parseFloat(priceStr)
    return isNaN(price) ? null : price
  }

  private calculateMinQuantity(record: any): number {
    // Find the first non-null price to determine minimum quantity
    const quantities = [48, 144, 576, 1152, 2880, 10000, 20000]

    for (const qty of quantities) {
      const price = this.parsePrice(record[`price${qty}`])
      if (price !== null) {
        return qty
      }
    }

    return 48 // Default minimum
  }

  private printMigrationSummary(summary: MigrationSummary): void {
    console.log('\n' + '='.repeat(80))
    console.log('📊 CSV MIGRATION SUMMARY')
    console.log('='.repeat(80))
    console.log(`✅ Overall Status: ${summary.success ? 'SUCCESS' : 'FAILED'}`)
    console.log(`📈 Total Records Processed: ${summary.totalProcessed}`)
    console.log(`✅ Total Records Inserted: ${summary.totalInserted}`)
    console.log(`❌ Total Errors: ${summary.totalErrors}`)
    console.log(`⏱️ Execution Time: ${(summary.executionTimeMs / 1000).toFixed(2)}s`)
    console.log('\n📋 TABLE BREAKDOWN:')

    summary.results.forEach(result => {
      const status = result.errorRecords === 0 ? '✅' : '❌'
      console.log(`${status} ${result.table.padEnd(20)} | ${result.insertedRecords.toString().padStart(4)} inserted | ${result.errorRecords.toString().padStart(2)} errors`)

      if (result.errors.length > 0 && this.config.verbose) {
        result.errors.slice(0, 3).forEach(error => {
          console.log(`   ⚠️ Row ${error.row}: ${error.error}`)
        })
        if (result.errors.length > 3) {
          console.log(`   ... and ${result.errors.length - 3} more errors`)
        }
      }
    })

    console.log('='.repeat(80) + '\n')
  }
}

// ============================================================================
// Export Migration Functions for Direct Use
// ============================================================================

export async function runFullMigration(config?: Partial<MigrationConfig>): Promise<MigrationSummary> {
  const service = new CSVMigrationService(config)
  return await service.migrateAllTables()
}

export async function runValidationOnly(config?: Partial<MigrationConfig>): Promise<MigrationSummary> {
  const service = new CSVMigrationService({ ...config, validateOnly: true })
  return await service.migrateAllTables()
}

export async function verifyMigration(config?: Partial<MigrationConfig>): Promise<{
  success: boolean
  issues: string[]
  statistics: Record<string, number>
}> {
  const service = new CSVMigrationService(config)
  return await service.verifyMigrationIntegrity()
}