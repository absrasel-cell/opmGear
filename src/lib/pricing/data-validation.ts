// ============================================================================
// US Custom Cap - Data Validation and Integrity Checks
// Comprehensive validation for migrated pricing data
// ============================================================================

import { supabaseAdmin } from '../supabase'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  statistics: Record<string, any>
}

export interface TableHealthCheck {
  tableName: string
  recordCount: number
  isHealthy: boolean
  issues: string[]
}

export class DataValidator {
  private supabase = supabaseAdmin

  // ============================================================================
  // Main Validation Methods
  // ============================================================================

  async validateAllData(): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const statistics: Record<string, any> = {}

    try {
      // 1. Basic table health checks
      console.log('🔍 Running basic table health checks...')
      const tableHealth = await this.checkTableHealth()
      statistics.tableHealth = tableHealth

      tableHealth.forEach(health => {
        if (!health.isHealthy) {
          errors.push(...health.issues.map(issue => `${health.tableName}: ${issue}`))
        }
        if (health.recordCount === 0) {
          warnings.push(`${health.tableName} is empty`)
        }
      })

      // 2. Data integrity checks
      console.log('🔗 Checking data integrity...')
      const integrityResults = await this.checkDataIntegrity()
      errors.push(...integrityResults.errors)
      warnings.push(...integrityResults.warnings)
      statistics.integrity = integrityResults.statistics

      // 3. Pricing data validation
      console.log('💰 Validating pricing data...')
      const pricingResults = await this.validatePricingData()
      errors.push(...pricingResults.errors)
      warnings.push(...pricingResults.warnings)
      statistics.pricing = pricingResults.statistics

      // 4. Search optimization validation
      console.log('🔎 Validating search optimization...')
      const searchResults = await this.validateSearchOptimization()
      errors.push(...searchResults.errors)
      warnings.push(...searchResults.warnings)
      statistics.search = searchResults.statistics

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        statistics
      }

    } catch (error) {
      errors.push(`Validation failed: ${error}`)
      return { isValid: false, errors, warnings, statistics }
    }
  }

  // ============================================================================
  // Table Health Checks
  // ============================================================================

  async checkTableHealth(): Promise<TableHealthCheck[]> {
    const tables = [
      'pricing_tiers', 'products', 'logo_methods', 'mold_charges',
      'premium_fabrics', 'premium_closures', 'accessories', 'delivery_methods'
    ]

    const healthChecks: TableHealthCheck[] = []

    for (const table of tables) {
      const issues: string[] = []
      let recordCount = 0
      let isHealthy = true

      try {
        // Check if table exists and get count
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          issues.push(`Table query failed: ${error.message}`)
          isHealthy = false
        } else {
          recordCount = count || 0
        }

        // Check for required columns based on table
        const columnChecks = await this.checkRequiredColumns(table)
        if (columnChecks.length > 0) {
          issues.push(...columnChecks)
          isHealthy = false
        }

      } catch (error) {
        issues.push(`Health check failed: ${error}`)
        isHealthy = false
      }

      healthChecks.push({
        tableName: table,
        recordCount,
        isHealthy,
        issues
      })
    }

    return healthChecks
  }

  private async checkRequiredColumns(tableName: string): Promise<string[]> {
    const issues: string[] = []

    try {
      // Get a sample record to check column existence
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (error) {
        return [`Could not check columns: ${error.message}`]
      }

      if (!data || data.length === 0) {
        return [] // Can't check columns on empty table
      }

      const record = data[0]
      const requiredColumns = this.getRequiredColumnsForTable(tableName)

      requiredColumns.forEach(column => {
        if (!(column in record)) {
          issues.push(`Missing required column: ${column}`)
        }
      })

    } catch (error) {
      issues.push(`Column check failed: ${error}`)
    }

    return issues
  }

  private getRequiredColumnsForTable(tableName: string): string[] {
    const columnMap: Record<string, string[]> = {
      pricing_tiers: ['tier_name', 'price_48', 'price_144'],
      products: ['name', 'code', 'pricing_tier_id'],
      logo_methods: ['name', 'application', 'size'],
      premium_fabrics: ['name', 'cost_type'],
      premium_closures: ['name', 'closure_type'],
      accessories: ['name'],
      delivery_methods: ['name', 'delivery_type'],
      mold_charges: ['size', 'charge_amount']
    }

    return columnMap[tableName] || []
  }

  // ============================================================================
  // Data Integrity Checks
  // ============================================================================

  async checkDataIntegrity(): Promise<{
    errors: string[]
    warnings: string[]
    statistics: Record<string, any>
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const statistics: Record<string, any> = {}

    // Check product-pricing tier relationships
    const { data: orphanedProducts } = await this.supabase
      .from('products')
      .select('name, pricing_tier_id')
      .is('pricing_tier_id', null)

    if (orphanedProducts && orphanedProducts.length > 0) {
      errors.push(`${orphanedProducts.length} products without pricing tiers`)
      statistics.orphanedProducts = orphanedProducts.length
    } else {
      statistics.orphanedProducts = 0
    }

    // Check for duplicate names
    const duplicateChecks = await Promise.all([
      this.checkDuplicates('pricing_tiers', 'tier_name'),
      this.checkDuplicates('products', 'name'),
      this.checkDuplicates('products', 'code'),
      this.checkDuplicates('logo_methods', 'name, application, size'),
      this.checkDuplicates('premium_fabrics', 'name'),
      this.checkDuplicates('premium_closures', 'name'),
      this.checkDuplicates('accessories', 'name'),
      this.checkDuplicates('delivery_methods', 'name')
    ])

    duplicateChecks.forEach(({ table, column, count }) => {
      if (count > 0) {
        errors.push(`${count} duplicate ${column} in ${table}`)
      }
      statistics[`duplicates_${table}_${column.replace(/[^a-zA-Z0-9]/g, '_')}`] = count
    })

    // Check for invalid foreign key relationships
    const fkResults = await this.checkForeignKeyIntegrity()
    errors.push(...fkResults.errors)
    warnings.push(...fkResults.warnings)
    Object.assign(statistics, fkResults.statistics)

    return { errors, warnings, statistics }
  }

  private async checkDuplicates(table: string, column: string): Promise<{
    table: string
    column: string
    count: number
  }> {
    try {
      // For composite columns, we need a different approach
      if (column.includes(',')) {
        const { data } = await this.supabase
          .from(table)
          .select(column)

        const seen = new Set()
        let duplicates = 0

        data?.forEach((record: Record<string, any>) => {
          const key = column.split(',').map(col => record[col.trim()]).join('|')
          if (seen.has(key)) {
            duplicates++
          } else {
            seen.add(key)
          }
        })

        return { table, column, count: duplicates }
      }

      // For single columns, use SQL aggregation
      const { data } = await this.supabase
        .rpc('count_duplicates', {
          table_name: table,
          column_name: column
        })

      return { table, column, count: data || 0 }
    } catch {
      return { table, column, count: 0 }
    }
  }

  private async checkForeignKeyIntegrity(): Promise<{
    errors: string[]
    warnings: string[]
    statistics: Record<string, any>
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const statistics: Record<string, any> = {}

    try {
      // Check products -> pricing_tiers relationship
      const { data: invalidProducts } = await this.supabase
        .from('products')
        .select(`
          name,
          pricing_tier_id,
          pricing_tiers!inner(tier_name)
        `)

      const { data: allProducts } = await this.supabase
        .from('products')
        .select('name, pricing_tier_id')

      const invalidCount = (allProducts?.length || 0) - (invalidProducts?.length || 0)
      if (invalidCount > 0) {
        errors.push(`${invalidCount} products reference invalid pricing tiers`)
      }
      statistics.invalidPricingTierReferences = invalidCount

    } catch (error) {
      warnings.push(`Could not check foreign key integrity: ${error}`)
    }

    return { errors, warnings, statistics }
  }

  // ============================================================================
  // Pricing Data Validation
  // ============================================================================

  async validatePricingData(): Promise<{
    errors: string[]
    warnings: string[]
    statistics: Record<string, any>
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const statistics: Record<string, any> = {}

    // Validate pricing tiers
    const tierValidation = await this.validatePricingTiers()
    errors.push(...tierValidation.errors)
    warnings.push(...tierValidation.warnings)
    Object.assign(statistics, tierValidation.statistics)

    // Validate logo method pricing
    const logoValidation = await this.validateLogoMethodPricing()
    errors.push(...logoValidation.errors)
    warnings.push(...logoValidation.warnings)
    Object.assign(statistics, logoValidation.statistics)

    // Validate volume discount logic
    const volumeValidation = await this.validateVolumeDiscounts()
    errors.push(...volumeValidation.errors)
    warnings.push(...volumeValidation.warnings)
    Object.assign(statistics, volumeValidation.statistics)

    return { errors, warnings, statistics }
  }

  private async validatePricingTiers(): Promise<{
    errors: string[]
    warnings: string[]
    statistics: Record<string, any>
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const statistics: Record<string, any> = {}

    const { data: tiers } = await this.supabase
      .from('pricing_tiers')
      .select('*')

    if (!tiers) {
      errors.push('Could not load pricing tiers')
      return { errors, warnings, statistics }
    }

    statistics.pricingTierCount = tiers.length

    tiers.forEach(tier => {
      const prices = [
        tier.price_48, tier.price_144, tier.price_576,
        tier.price_1152, tier.price_2880, tier.price_10000
      ]

      // Check for negative prices
      if (prices.some(p => p < 0)) {
        errors.push(`${tier.tier_name} has negative prices`)
      }

      // Check for proper volume discount progression
      for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i - 1]) {
          warnings.push(`${tier.tier_name} has increasing prices at higher volumes`)
          break
        }
      }

      // Check for zero prices (might be intentional)
      if (prices.some(p => p === 0)) {
        warnings.push(`${tier.tier_name} has zero prices`)
      }
    })

    return { errors, warnings, statistics }
  }

  private async validateLogoMethodPricing(): Promise<{
    errors: string[]
    warnings: string[]
    statistics: Record<string, any>
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const statistics: Record<string, any> = {}

    const { data: methods } = await this.supabase
      .from('logo_methods')
      .select('*')

    if (!methods) {
      errors.push('Could not load logo methods')
      return { errors, warnings, statistics }
    }

    statistics.logoMethodCount = methods.length

    methods.forEach(method => {
      const prices = [
        method.price_48, method.price_144, method.price_576,
        method.price_1152, method.price_2880, method.price_10000,
        method.price_20000
      ]

      // Check for negative prices
      if (prices.some(p => p < 0)) {
        errors.push(`Logo method ${method.name} (${method.application}, ${method.size}) has negative prices`)
      }

      // Size-based pricing logic validation
      if (method.size === 'Large' && prices[0] <= prices[1]) {
        warnings.push(`Large logo method ${method.name} pricing seems low`)
      }
    })

    return { errors, warnings, statistics }
  }

  private async validateVolumeDiscounts(): Promise<{
    errors: string[]
    warnings: string[]
    statistics: Record<string, any>
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const statistics: Record<string, any> = {}

    const tables = ['pricing_tiers', 'logo_methods', 'premium_fabrics', 'premium_closures', 'accessories']

    for (const table of tables) {
      const { data: records } = await this.supabase
        .from(table)
        .select('*')

      if (!records) continue

      let invalidDiscountCount = 0

      records.forEach(record => {
        // Get price columns for this table
        const priceColumns = Object.keys(record).filter(key => key.startsWith('price_'))
        const prices = priceColumns.map(col => record[col]).filter(p => p !== null)

        if (prices.length > 1) {
          for (let i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) {
              invalidDiscountCount++
              break
            }
          }
        }
      })

      if (invalidDiscountCount > 0) {
        warnings.push(`${invalidDiscountCount} records in ${table} have invalid volume discounts`)
      }

      statistics[`${table}_invalidDiscounts`] = invalidDiscountCount
    }

    return { errors, warnings, statistics }
  }

  // ============================================================================
  // Search Optimization Validation
  // ============================================================================

  async validateSearchOptimization(): Promise<{
    errors: string[]
    warnings: string[]
    statistics: Record<string, any>
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const statistics: Record<string, any> = {}

    // Check products nick_names population
    const { data: products } = await this.supabase
      .from('products')
      .select('name, nick_names, tags')

    if (products) {
      const emptyNickNames = products.filter(p => !p.nick_names || p.nick_names.length === 0)
      const emptyTags = products.filter(p => !p.tags || Object.keys(p.tags).length === 0)

      if (emptyNickNames.length > 0) {
        warnings.push(`${emptyNickNames.length} products missing nick_names`)
      }

      if (emptyTags.length > 0) {
        warnings.push(`${emptyTags.length} products missing tags`)
      }

      statistics.productsWithNickNames = products.length - emptyNickNames.length
      statistics.productsWithTags = products.length - emptyTags.length
      statistics.totalProducts = products.length
    }

    // Check fabric color optimization
    const { data: fabrics } = await this.supabase
      .from('premium_fabrics')
      .select('name, available_colors, color_note')

    if (fabrics) {
      const emptyColors = fabrics.filter(f =>
        (!f.available_colors || f.available_colors.length === 0) &&
        f.color_note && f.color_note !== 'All'
      )

      if (emptyColors.length > 0) {
        warnings.push(`${emptyColors.length} fabrics with color notes but no available_colors array`)
      }

      statistics.fabricsWithColors = fabrics.length - emptyColors.length
    }

    return { errors, warnings, statistics }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async generateValidationReport(): Promise<string> {
    console.log('🔍 Generating comprehensive validation report...')

    const result = await this.validateAllData()

    let report = '='.repeat(80) + '\n'
    report += 'US CUSTOM CAP - DATA VALIDATION REPORT\n'
    report += '='.repeat(80) + '\n'
    report += `Generated: ${new Date().toISOString()}\n`
    report += `Overall Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}\n`
    report += `Total Errors: ${result.errors.length}\n`
    report += `Total Warnings: ${result.warnings.length}\n\n`

    if (result.errors.length > 0) {
      report += '❌ ERRORS:\n'
      result.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`
      })
      report += '\n'
    }

    if (result.warnings.length > 0) {
      report += '⚠️  WARNINGS:\n'
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`
      })
      report += '\n'
    }

    report += '📊 STATISTICS:\n'
    Object.entries(result.statistics).forEach(([key, value]) => {
      if (typeof value === 'object') {
        report += `${key}:\n`
        Object.entries(value).forEach(([subKey, subValue]) => {
          report += `  - ${subKey}: ${subValue}\n`
        })
      } else {
        report += `${key}: ${value}\n`
      }
    })

    report += '='.repeat(80) + '\n'

    return report
  }
}

// Export convenience functions
export async function validatePricingData(): Promise<ValidationResult> {
  const validator = new DataValidator()
  return await validator.validateAllData()
}

export async function generateValidationReport(): Promise<string> {
  const validator = new DataValidator()
  return await validator.generateValidationReport()
}