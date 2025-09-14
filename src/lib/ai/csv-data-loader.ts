/**
 * CSV Data Loader for AI Services
 * Loads and parses CSV data for logo analysis and pricing calculations
 */

import fs from 'fs';
import path from 'path';

interface LogoOption {
  Name: string;
  Application: string;
  Size: string;
  'Size Example': string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  price20000: number;
  'Mold Charge': number;
}

interface BlankCapProduct {
  Name: string;
  Profile: string;
  'Bill Shape': string;
  'Panel Count': string;
  priceTier: string;
  Structure: string;
}

interface PriceTier {
  Tier: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  price20000: number;
}

export class CSVDataLoader {
  private static logoOptionsCache: LogoOption[] | null = null;
  private static blankCapProductsCache: BlankCapProduct[] | null = null;
  private static priceTiersCache: PriceTier[] | null = null;

  /**
   * Load logo options from CSV
   */
  static async getLogoOptions(): Promise<LogoOption[]> {
    if (this.logoOptionsCache) {
      return this.logoOptionsCache;
    }

    try {
      const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Logo.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      
      this.logoOptionsCache = this.parseCSV(csvContent, {
        price48: 'number',
        price144: 'number',
        price576: 'number',
        price1152: 'number',
        price2880: 'number',
        price10000: 'number',
        price20000: 'number',
        'Mold Charge': 'number'
      });

      console.log(`📊 Loaded ${this.logoOptionsCache.length} logo options from CSV`);
      return this.logoOptionsCache;

    } catch (error) {
      console.error('Failed to load logo options CSV:', error);
      return this.getFallbackLogoOptions();
    }
  }

  /**
   * Load blank cap products from CSV
   */
  static async getBlankCapProducts(): Promise<BlankCapProduct[]> {
    if (this.blankCapProductsCache) {
      return this.blankCapProductsCache;
    }

    try {
      const csvPath = path.join(process.cwd(), 'src/app/ai/Blank Cap/Customer Products.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      
      this.blankCapProductsCache = this.parseCSV(csvContent, {});

      console.log(`📊 Loaded ${this.blankCapProductsCache.length} blank cap products from CSV`);
      return this.blankCapProductsCache;

    } catch (error) {
      console.error('Failed to load blank cap products CSV:', error);
      return this.getFallbackBlankCapProducts();
    }
  }

  /**
   * Load pricing tiers from CSV
   */
  static async getPriceTiers(): Promise<PriceTier[]> {
    if (this.priceTiersCache) {
      return this.priceTiersCache;
    }

    try {
      const csvPath = path.join(process.cwd(), 'src/app/ai/Blank Cap/priceTier.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      
      this.priceTiersCache = this.parseCSV(csvContent, {
        price48: 'number',
        price144: 'number',
        price576: 'number',
        price1152: 'number',
        price2880: 'number',
        price10000: 'number',
        price20000: 'number'
      });

      console.log(`📊 Loaded ${this.priceTiersCache.length} price tiers from CSV`);
      return this.priceTiersCache;

    } catch (error) {
      console.error('Failed to load price tiers CSV:', error);
      return this.getFallbackPriceTiers();
    }
  }

  /**
   * Get logo option by method, application, and size
   */
  static async getLogoOption(
    method: string, 
    application: string = 'Direct', 
    size: string = 'Medium'
  ): Promise<LogoOption | null> {
    const logoOptions = await this.getLogoOptions();
    
    const option = logoOptions.find(option => 
      option.Name.toLowerCase() === method.toLowerCase() &&
      option.Application.toLowerCase() === application.toLowerCase() &&
      option.Size.toLowerCase() === size.toLowerCase()
    );

    return option || null;
  }

  /**
   * Get pricing for specific quantity and method
   */
  static async getLogoPricing(
    method: string,
    application: string = 'Direct',
    size: string = 'Medium',
    quantity: number
  ): Promise<{ unitCost: number; moldCharge: number } | null> {
    const option = await this.getLogoOption(method, application, size);
    
    if (!option) {
      return null;
    }

    const priceKey = this.getClosestQuantityKey(quantity);
    const unitCost = option[priceKey as keyof LogoOption] as number || 0;
    const moldCharge = option['Mold Charge'] || 0;

    return { unitCost, moldCharge };
  }

  /**
   * Get blank cap product by name
   */
  static async getBlankCapProduct(name: string): Promise<BlankCapProduct | null> {
    const products = await this.getBlankCapProducts();
    
    const product = products.find(product => 
      product.Name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(product.Name.toLowerCase())
    );

    return product || null;
  }

  /**
   * Get price tier pricing
   */
  static async getPriceTierPricing(
    tier: string,
    quantity: number
  ): Promise<number> {
    const priceTiers = await this.getPriceTiers();
    
    const tierData = priceTiers.find(t => t.Tier.toLowerCase() === tier.toLowerCase());
    
    if (!tierData) {
      return 0;
    }

    const priceKey = this.getClosestQuantityKey(quantity);
    return tierData[priceKey as keyof PriceTier] as number || 0;
  }

  /**
   * Parse CSV content into objects
   */
  private static parseCSV(csvContent: string, numberFields: Record<string, string>): any[] {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        let value: string | number = values[j] || '';

        // Convert number fields
        if (numberFields[header] === 'number') {
          value = parseFloat(value as string) || 0;
        }
        
        row[header] = value;
      }
      
      results.push(row);
    }
    
    return results;
  }

  /**
   * Get closest quantity key for pricing
   */
  private static getClosestQuantityKey(quantity: number): string {
    const quantities = [48, 144, 576, 1152, 2880, 10000, 20000];
    
    // Find the closest quantity tier (equal or greater)
    for (const tier of quantities) {
      if (quantity <= tier) {
        return `price${tier}`;
      }
    }
    
    // If quantity is larger than all tiers, use the largest tier
    return 'price20000';
  }

  /**
   * Clear caches (useful for testing or data updates)
   */
  static clearCaches(): void {
    this.logoOptionsCache = null;
    this.blankCapProductsCache = null;
    this.priceTiersCache = null;
    console.log('📊 CSV data caches cleared');
  }

  /**
   * Fallback logo options if CSV fails to load
   */
  private static getFallbackLogoOptions(): LogoOption[] {
    return [
      {
        Name: '3D Embroidery',
        Application: 'Direct',
        Size: 'Large',
        'Size Example': '4 x 2.25',
        price48: 1.4,
        price144: 0.95,
        price576: 0.82,
        price1152: 0.75,
        price2880: 0.7,
        price10000: 0.63,
        price20000: 0.63,
        'Mold Charge': 0
      },
      {
        Name: 'Flat Embroidery',
        Application: 'Direct',
        Size: 'Medium',
        'Size Example': '3 x 2',
        price48: 0.9,
        price144: 0.65,
        price576: 0.55,
        price1152: 0.52,
        price2880: 0.5,
        price10000: 0.45,
        price20000: 0.45,
        'Mold Charge': 0
      },
      {
        Name: 'Screen Print',
        Application: 'Direct',
        Size: 'Large',
        'Size Example': '4 x 2.25',
        price48: 1.2,
        price144: 0.8,
        price576: 0.7,
        price1152: 0.65,
        price2880: 0.6,
        price10000: 0.55,
        price20000: 0.55,
        'Mold Charge': 0
      }
    ];
  }

  /**
   * Fallback blank cap products if CSV fails to load
   */
  private static getFallbackBlankCapProducts(): BlankCapProduct[] {
    return [
      {
        Name: 'Classic Snapback',
        Profile: 'High',
        'Bill Shape': 'Flat',
        'Panel Count': '6-Panel',
        priceTier: 'Tier 1',
        Structure: 'Structured'
      },
      {
        Name: 'Trucker Hat',
        Profile: 'Mid',
        'Bill Shape': 'Curved',
        'Panel Count': '5-Panel',
        priceTier: 'Tier 1',
        Structure: 'Structured'
      }
    ];
  }

  /**
   * Fallback price tiers if CSV fails to load
   */
  private static getFallbackPriceTiers(): PriceTier[] {
    return [
      {
        Tier: 'Tier 1',
        price48: 4.5,
        price144: 3.2,
        price576: 2.8,
        price1152: 2.6,
        price2880: 2.4,
        price10000: 2.2,
        price20000: 2.0
      },
      {
        Tier: 'Tier 2',
        price48: 5.2,
        price144: 3.8,
        price576: 3.4,
        price1152: 3.2,
        price2880: 3.0,
        price10000: 2.8,
        price20000: 2.6
      }
    ];
  }
}