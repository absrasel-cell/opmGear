import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

export interface BlankCapProduct {
  Name: string;
  Profile: string;
  'Bill Shape': string;
  'Panel Count': string;
  priceTier: string;
  'Structure Type': string;
  'Nick Names': string;
}

export interface PricingTier {
  Name: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
}

export interface LogoOption {
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
  'Mold Charge'?: string;
  type?: string; // Added by processing logic
}

export interface ColorOption {
  Name: string;
  Type: string;
  Comments: string;
}

export interface SizeOption {
  Brand: string;
  'Hat Size': string;
  'Head Circumference': string;
  Size: string;
  'Sarcastic Size Name': string;
}

export interface AccessoryOption {
  Name: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
}

export interface ClosureOption {
  Name: string;
  Type: string;
  price48?: number;
  price144?: number;
  price576?: number;
  price1152?: number;
  price2880?: number;
  price10000?: number;
  Comments?: string;
}

export interface FabricOption {
  Name: string;
  Type: string;
  costType: string;
  price48?: number;
  price144?: number;
  price576?: number;
  price1152?: number;
  price2880?: number;
  price10000?: number;
  'Color Note': string;
  Comments: string;
}

export interface DeliveryOption {
  Name: string;
  type: string;
  'Delivery Days': string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  price20000: number;
}

// Cache for loaded CSV data
const csvCache = new Map<string, any[]>();

async function loadCSVData<T>(filePath: string): Promise<T[]> {
  // Check cache first
  if (csvCache.has(filePath)) {
    return csvCache.get(filePath) as T[];
  }

  return new Promise((resolve, reject) => {
    const results: T[] = [];
    const absolutePath = path.join(process.cwd(), 'src', 'app', filePath);

    fs.createReadStream(absolutePath)
      .pipe(csv())
      .on('data', (data) => {
        // Convert numeric fields where appropriate
        const processedData = { ...data };
        
        // Convert price fields to numbers
        Object.keys(processedData).forEach(key => {
          if (key.startsWith('price') && processedData[key] !== '') {
            processedData[key] = parseFloat(processedData[key]) || 0;
          }
        });
        
        // Handle type field - set to 'logos' for logo items by default
        if (!processedData.type && processedData.Name) {
          if (processedData.Name.toLowerCase().includes('delivery') || processedData.Name.toLowerCase().includes('freight')) {
            processedData.type = 'Shipping';
          } else if (processedData.Name.toLowerCase().includes('mold')) {
            processedData.type = 'Mold';
          } else if (processedData.Name.toLowerCase().includes('service') || processedData.Name.toLowerCase().includes('graphics') || processedData.Name.toLowerCase().includes('sampling')) {
            processedData.type = 'Service';
          } else {
            processedData.type = 'logos';
          }
        }

        results.push(processedData as T);
      })
      .on('end', () => {
        csvCache.set(filePath, results);
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

export class AIDataLoader {
  static async getBlankCapProducts(): Promise<BlankCapProduct[]> {
    return loadCSVData<BlankCapProduct>('ai/Blank Cap/Customer Products.csv');
  }

  static async getPricingTiers(): Promise<PricingTier[]> {
    return loadCSVData<PricingTier>('ai/Blank Cap/priceTier.csv');
  }

  static async getLogoOptions(): Promise<LogoOption[]> {
    return loadCSVData<LogoOption>('ai/Options/Logo.csv');
  }

  static async getColorOptions(): Promise<ColorOption[]> {
    return loadCSVData<ColorOption>('ai/Options/Colors.csv');
  }

  static async getSizeOptions(): Promise<SizeOption[]> {
    return loadCSVData<SizeOption>('ai/Options/Size.csv');
  }

  static async getAccessoryOptions(): Promise<AccessoryOption[]> {
    return loadCSVData<AccessoryOption>('ai/Options/Accessories.csv');
  }

  static async getClosureOptions(): Promise<ClosureOption[]> {
    return loadCSVData<ClosureOption>('ai/Options/Closure.csv');
  }

  static async getFabricOptions(): Promise<FabricOption[]> {
    return loadCSVData<FabricOption>('ai/Options/Fabric.csv');
  }

  static async getDeliveryOptions(): Promise<DeliveryOption[]> {
    return loadCSVData<DeliveryOption>('ai/Options/Delivery.csv');
  }

  // Helper methods for specific lookups
  static async findBlankCapByName(name: string): Promise<BlankCapProduct | null> {
    const products = await this.getBlankCapProducts();
    return products.find(p => p.Name.toLowerCase().includes(name.toLowerCase())) || null;
  }

  static async findBlankCapBySpecs(profile: string, billShape: string, panelCount: string, structure: string): Promise<BlankCapProduct[]> {
    const products = await this.getBlankCapProducts();
    return products.filter(p => 
      p.Profile.toLowerCase() === profile.toLowerCase() &&
      p['Bill Shape'].toLowerCase() === billShape.toLowerCase() &&
      p['Panel Count'].toLowerCase() === panelCount.toLowerCase() &&
      p['Structure Type'].toLowerCase().includes(structure.toLowerCase())
    );
  }

  static async getPriceForTier(tierName: string, quantity: number): Promise<number> {
    const tiers = await this.getPricingTiers();
    const tier = tiers.find(t => t.Name === tierName);
    
    if (!tier) return 0;

    if (quantity >= 10000) return tier.price10000;
    if (quantity >= 2880) return tier.price2880;
    if (quantity >= 1152) return tier.price1152;
    if (quantity >= 576) return tier.price576;
    if (quantity >= 144) return tier.price144;
    return tier.price48;
  }

  static async getLogoPriceForQuantity(logoName: string, position: string, quantity: number): Promise<{ unitPrice: number; moldCharge: number; totalCost: number }> {
    const logos = await this.getLogoOptions();
    
    // Get position-based size first
    const size = this.getPositionBasedSize(position);
    
    // Find logo by name, size, and application
    let logo;
    
    if (logoName.toLowerCase().includes('rubber')) {
      logo = logos.find(l => 
        l.Name.toLowerCase() === 'rubber' &&
        l.Size.toLowerCase() === size.toLowerCase() &&
        l.Application.toLowerCase() === 'patch'
      );
    } else if (logoName.toLowerCase().includes('3d emb')) {
      logo = logos.find(l => 
        l.Name.toLowerCase() === '3d embroidery' &&
        l.Size.toLowerCase() === size.toLowerCase() &&
        l.Application.toLowerCase() === 'direct'
      );
    } else if (logoName.toLowerCase().includes('leather')) {
      logo = logos.find(l => 
        l.Name.toLowerCase() === 'leather' &&
        l.Size.toLowerCase() === size.toLowerCase() &&
        l.Application.toLowerCase() === 'patch'
      );
    } else if (logoName.toLowerCase().includes('flat embroidery') || logoName.toLowerCase().includes('embroidery')) {
      logo = logos.find(l => 
        l.Name.toLowerCase() === 'flat embroidery' &&
        l.Size.toLowerCase() === size.toLowerCase() &&
        l.Application.toLowerCase() === 'direct'
      );
    }

    if (!logo) {
      console.warn(`Logo not found: ${logoName} with size ${size}`);
      return { unitPrice: 0, moldCharge: 0, totalCost: 0 };
    }

    // Get unit price based on quantity
    let unitPrice = 0;
    if (quantity >= 20000) unitPrice = logo.price20000 || 0;
    else if (quantity >= 10000) unitPrice = logo.price10000 || 0;
    else if (quantity >= 2880) unitPrice = logo.price2880 || 0;
    else if (quantity >= 1152) unitPrice = logo.price1152 || 0;
    else if (quantity >= 576) unitPrice = logo.price576 || 0;
    else if (quantity >= 144) unitPrice = logo.price144 || 0;
    else unitPrice = logo.price48 || 0;

    // Calculate mold charge for patches
    let moldCharge = 0;
    if (logo['Mold Charge']) {
      // Find the mold charge entry
      const moldChargeOptions = await this.getMoldCharges();
      const moldOption = moldChargeOptions.find(m => 
        m.Name.toLowerCase() === 'mold charge' &&
        m.Size.toLowerCase() === size.toLowerCase()
      );
      moldCharge = moldOption ? moldOption.price48 : 0;
    }

    const totalCost = (unitPrice * quantity) + moldCharge;
    
    return {
      unitPrice,
      moldCharge,
      totalCost
    };
  }

  static async findColorByName(colorName: string): Promise<ColorOption | null> {
    const colors = await this.getColorOptions();
    return colors.find(c => c.Name.toLowerCase() === colorName.toLowerCase()) || null;
  }

  static async getSizeRecommendation(headSize: string): Promise<SizeOption | null> {
    const sizes = await this.getSizeOptions();
    return sizes.find(s => 
      s['Head Circumference'].toLowerCase().includes(headSize.toLowerCase()) ||
      s.Size.toLowerCase() === headSize.toLowerCase()
    ) || null;
  }

  static async getDefaultLogoSetup(): Promise<{ location: string; logo: string; size: string; application: string }[]> {
    return [
      { location: 'Front', logo: '3D Embroidery', size: 'Large', application: 'Direct' },
      { location: 'Right', logo: 'Flat Embroidery', size: 'Small', application: 'Direct' },
      { location: 'Left', logo: 'Flat Embroidery', size: 'Small', application: 'Direct' },
      { location: 'Back', logo: 'Flat Embroidery', size: 'Small', application: 'Direct' },
      { location: 'Upper Bill', logo: 'Flat Embroidery', size: 'Medium', application: 'Direct' },
      { location: 'Under Bill', logo: 'Sublimated Print', size: 'Large', application: 'Direct' }
    ];
  }

  static getDefaultCapSpecs(): {
    panelCount: string;
    profile: string;
    structure: string;
    closure: string;
    fabricSolid: string;
    fabricSplit: string;
    stitching: string;
  } {
    return {
      panelCount: '6-Panel',
      profile: 'High',
      structure: 'Structured',
      closure: 'Snapback',
      fabricSolid: 'Chino Twill',
      fabricSplit: 'Chino Twill/Trucker Mesh',
      stitching: 'Matching'
    };
  }

  // Get mold charges from CSV
  static async getMoldCharges(): Promise<Array<{ Name: string; Size: string; price48: number }>> {
    const customizationData = await this.getLogoOptions();
    return customizationData.filter(item => item.Name === 'Mold Charge');
  }

  // Get position-based size default per instruction.txt
  static getPositionBasedSize(position: string): string {
    switch(position.toLowerCase()) {
      case 'front': return 'Large';
      case 'left':
      case 'right':
      case 'back': return 'Small';
      case 'upper bill': return 'Medium';
      case 'under bill': return 'Large';
      default: return 'Medium';
    }
  }

  // Get delivery cost for quantity
  static async getDeliveryPriceForQuantity(deliveryMethod: string, quantity: number): Promise<number> {
    const deliveryOptions = await this.getDeliveryOptions();
    
    let methodName = 'Regular Delivery';
    if (deliveryMethod.toLowerCase().includes('priority') || deliveryMethod.toLowerCase().includes('express')) {
      methodName = 'Priority Delivery';
    } else if (deliveryMethod.toLowerCase().includes('air')) {
      methodName = 'Air Freight';
    } else if (deliveryMethod.toLowerCase().includes('sea')) {
      methodName = 'Sea Freight';
    }
    
    const delivery = deliveryOptions.find(d => d.Name === methodName);
    if (!delivery) return 0;

    // Get unit price based on quantity
    let unitPrice = 0;
    if (quantity >= 10000) unitPrice = delivery.price10000;
    else if (quantity >= 2880) unitPrice = delivery.price2880;
    else if (quantity >= 1152) unitPrice = delivery.price1152;
    else if (quantity >= 576) unitPrice = delivery.price576;
    else if (quantity >= 144) unitPrice = delivery.price144;
    else unitPrice = delivery.price48;

    return unitPrice * quantity;
  }

  // Clear cache (useful for testing or if data updates)
  static clearCache(): void {
    csvCache.clear();
  }
}

export default AIDataLoader;