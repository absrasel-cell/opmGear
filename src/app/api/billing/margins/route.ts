import { NextRequest, NextResponse } from 'next/server';

// Product type categories from Webflow and CSV analysis
// Factory cost is now handled by CSV data, so we only store margin settings
export interface MarginSetting {
  id: string;
  productType: string;
  category: 'blank_caps' | 'logos' | 'accessories' | 'closures' | 'fabrics' | 'applications' | 'shipping' | 'delivery';
  marginPercent: number;
  flatMargin: number;
  isActive: boolean;
  appliedScope: 'global' | 'per_member';
  memberOverrides?: { [userId: string]: { marginPercent: number; flatMargin: number } };
}

export interface MarginMode {
  mode: 'global' | 'detailed';
  description: string;
}

export interface MarginAPIRequest {
  settings: Partial<MarginSetting>[];
  scope?: 'global' | 'per_member';
  mode?: 'global' | 'detailed';
}

export interface MarginAPIResponse {
  success: boolean;
  data: MarginSetting[];
  mode?: 'global' | 'detailed';
  categories: string[];
  message?: string;
  error?: string;
}

// Mock data based on the CSV analysis - in production this would be stored in database
// Factory costs are now managed via CSV files and only margin settings are stored here
const marginSettings: MarginSetting[] = [
  // Blank Caps - Applied to CSV factory pricing data
  {
    id: '1',
    productType: 'Blank Caps (All Tiers)',
    category: 'blank_caps',
    marginPercent: 20,
    flatMargin: 0,
    isActive: true,
    appliedScope: 'global'
  },
  
  // Logo Types - Applied to customization pricing
  {
    id: '2',
    productType: '3D Embroidery',
    category: 'logos',
    marginPercent: 35,
    flatMargin: 0.05,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '3',
    productType: 'Rubber Patches',
    category: 'logos',
    marginPercent: 40,
    flatMargin: 0.10,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '4',
    productType: 'Woven Patches',
    category: 'logos',
    marginPercent: 38,
    flatMargin: 0.08,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '5',
    productType: 'Leather Patches',
    category: 'logos',
    marginPercent: 42,
    flatMargin: 0.12,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '6',
    productType: 'Standard Embroidery',
    category: 'logos',
    marginPercent: 35,
    flatMargin: 0.05,
    isActive: true,
    appliedScope: 'global'
  },
  
  // Accessories - Applied to accessory pricing
  {
    id: '7',
    productType: 'Hang Tags',
    category: 'accessories',
    marginPercent: 50,
    flatMargin: 0.05,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '8',
    productType: 'Inside Labels',
    category: 'accessories',
    marginPercent: 45,
    flatMargin: 0.03,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '9',
    productType: 'B-Tape Print',
    category: 'accessories',
    marginPercent: 40,
    flatMargin: 0.02,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '10',
    productType: 'Stickers & Eyelets',
    category: 'accessories',
    marginPercent: 35,
    flatMargin: 0.02,
    isActive: true,
    appliedScope: 'global'
  },
  
  // Premium Closures
  {
    id: '11',
    productType: 'Premium Closures',
    category: 'closures',
    marginPercent: 30,
    flatMargin: 0.05,
    isActive: true,
    appliedScope: 'global'
  },
  
  // Premium Fabrics
  {
    id: '12',
    productType: 'Premium Fabrics',
    category: 'fabrics',
    marginPercent: 25,
    flatMargin: 0.10,
    isActive: true,
    appliedScope: 'global'
  },
  
  // Applications
  {
    id: '13',
    productType: 'Applications',
    category: 'applications',
    marginPercent: 40,
    flatMargin: 0.03,
    isActive: true,
    appliedScope: 'global'
  },
  
  // Delivery/Shipping - Applied to delivery cost calculations
  {
    id: '14',
    productType: 'Regular Delivery',
    category: 'delivery',
    marginPercent: 15,
    flatMargin: 0.50,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '15',
    productType: 'Priority Delivery',
    category: 'delivery',
    marginPercent: 18,
    flatMargin: 0.60,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '16',
    productType: 'Air Freight',
    category: 'delivery',
    marginPercent: 25,
    flatMargin: 0.20,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '17',
    productType: 'Sea Freight',
    category: 'delivery',
    marginPercent: 30,
    flatMargin: 0.10,
    isActive: true,
    appliedScope: 'global'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const scope = searchParams.get('scope');
    const mode = searchParams.get('mode') || 'global'; // 'global' or 'detailed'
    
    let filteredSettings = marginSettings.filter(setting => setting.isActive);
    
    if (category && category !== 'all') {
      filteredSettings = filteredSettings.filter(setting => setting.category === category);
    }
    
    if (scope) {
      filteredSettings = filteredSettings.filter(setting => setting.appliedScope === scope);
    }
    
    // In global mode, return only category-level margins (blank_caps for caps pricing)
    // In detailed mode, return specific item margins with category fallbacks
    if (mode === 'global') {
      // For global mode, prioritize category-level settings
      // Group by category and return the most general setting for each category
      const categorySettings = filteredSettings.reduce((acc: any[], setting: MarginSetting) => {
        const existingCategory = acc.find(s => s.category === setting.category);
        if (!existingCategory) {
          acc.push(setting);
        }
        return acc;
      }, []);
      
      return NextResponse.json({
        success: true,
        data: categorySettings,
        mode: 'global',
        categories: ['blank_caps', 'logos', 'accessories', 'closures', 'fabrics', 'applications', 'delivery']
      });
    } else {
      // For detailed mode, return all specific item settings
      return NextResponse.json({
        success: true,
        data: filteredSettings,
        mode: 'detailed',
        categories: ['blank_caps', 'logos', 'accessories', 'closures', 'fabrics', 'applications', 'delivery']
      });
    }
  } catch (error) {
    console.error('Error fetching margin settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch margin settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings, scope = 'global', mode = 'global' } = body;
    
    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: 'Invalid settings data' },
        { status: 400 }
      );
    }
    
    // Update margin settings
    settings.forEach((newSetting: Partial<MarginSetting>) => {
      const existingIndex = marginSettings.findIndex(s => s.id === newSetting.id);
      
      if (existingIndex !== -1) {
        // Update existing setting
        marginSettings[existingIndex] = {
          ...marginSettings[existingIndex],
          ...newSetting,
          appliedScope: scope
        };
      } else if (newSetting.id) {
        // Add new setting
        marginSettings.push({
          id: newSetting.id,
          productType: newSetting.productType || 'Unknown',
          category: newSetting.category || 'accessories',
          marginPercent: newSetting.marginPercent || 0,
          flatMargin: newSetting.flatMargin || 0,
          isActive: newSetting.isActive !== false,
          appliedScope: scope as 'global' | 'per_member',
          memberOverrides: newSetting.memberOverrides || {}
        });
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Margin settings updated successfully',
      mode: mode,
      data: marginSettings.filter(s => s.isActive)
    });
  } catch (error) {
    console.error('Error updating margin settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update margin settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, productTypeId, marginPercent, flatMargin } = body;
    
    if (!userId || !productTypeId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Find the margin setting and add/update member override
    const settingIndex = marginSettings.findIndex(s => s.id === productTypeId);
    
    if (settingIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Product type not found' },
        { status: 404 }
      );
    }
    
    if (!marginSettings[settingIndex].memberOverrides) {
      marginSettings[settingIndex].memberOverrides = {};
    }
    
    marginSettings[settingIndex].memberOverrides![userId] = {
      marginPercent: marginPercent || 0,
      flatMargin: flatMargin || 0
    };
    
    return NextResponse.json({
      success: true,
      message: 'Member margin override updated successfully',
      data: marginSettings[settingIndex]
    });
  } catch (error) {
    console.error('Error updating member margin override:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update member margin override' },
      { status: 500 }
    );
  }
}

// Utility function to apply margin to factory cost (factory cost comes from CSV data)
export function applyMarginToFactoryCost(
  factoryCost: number,
  marginPercent: number,
  flatMargin: number
): number {
  return Math.max(0, factoryCost + (factoryCost * marginPercent / 100) + flatMargin);
}

// Backward compatibility - deprecated, use applyMarginToFactoryCost instead
export function calculatePartnerCost(
  factoryCost: number,
  marginPercent: number,
  flatMargin: number
): number {
  return applyMarginToFactoryCost(factoryCost, marginPercent, flatMargin);
}

// Utility function to get margin for specific user (with overrides)
export function getUserMargin(
  setting: MarginSetting,
  userId?: string
): { marginPercent: number; flatMargin: number } {
  if (userId && setting.memberOverrides && setting.memberOverrides[userId]) {
    return setting.memberOverrides[userId];
  }
  
  return {
    marginPercent: setting.marginPercent,
    flatMargin: setting.flatMargin
  };
}