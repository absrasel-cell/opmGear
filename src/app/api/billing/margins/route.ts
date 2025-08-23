import { NextRequest, NextResponse } from 'next/server';

// Product type categories from Webflow and CSV analysis
export interface MarginSetting {
  id: string;
  productType: string;
  category: 'blank_caps' | 'logos' | 'accessories' | 'closures' | 'fabrics' | 'applications' | 'shipping';
  factoryCost: number;
  marginPercent: number;
  flatMargin: number;
  isActive: boolean;
  appliedScope: 'global' | 'per_member';
  memberOverrides?: { [userId: string]: { marginPercent: number; flatMargin: number } };
}

// Mock data based on the CSV analysis - in production this would be stored in database
const marginSettings: MarginSetting[] = [
  // Blank Caps
  {
    id: '1',
    productType: 'Blank Caps',
    category: 'blank_caps',
    factoryCost: 3.50,
    marginPercent: 20,
    flatMargin: 0,
    isActive: true,
    appliedScope: 'global'
  },
  
  // Logo Types
  {
    id: '2',
    productType: '3D Embroidery',
    category: 'logos',
    factoryCost: 0.15,
    marginPercent: 35,
    flatMargin: 0.05,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '3',
    productType: 'Rubber Patches',
    category: 'logos',
    factoryCost: 0.80,
    marginPercent: 40,
    flatMargin: 0.10,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '4',
    productType: 'Woven Patches',
    category: 'logos',
    factoryCost: 0.65,
    marginPercent: 38,
    flatMargin: 0.08,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '5',
    productType: 'Leather Patches',
    category: 'logos',
    factoryCost: 0.70,
    marginPercent: 42,
    flatMargin: 0.12,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '6',
    productType: 'Standard Embroidery',
    category: 'logos',
    factoryCost: 0.50,
    marginPercent: 35,
    flatMargin: 0.05,
    isActive: true,
    appliedScope: 'global'
  },
  
  // Accessories
  {
    id: '7',
    productType: 'Hang Tags',
    category: 'accessories',
    factoryCost: 0.30,
    marginPercent: 50,
    flatMargin: 0.05,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '8',
    productType: 'Inside Labels',
    category: 'accessories',
    factoryCost: 0.20,
    marginPercent: 45,
    flatMargin: 0.03,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '9',
    productType: 'B-Tape Print',
    category: 'accessories',
    factoryCost: 0.18,
    marginPercent: 40,
    flatMargin: 0.02,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '10',
    productType: 'Stickers & Eyelets',
    category: 'accessories',
    factoryCost: 0.15,
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
    factoryCost: 0.35,
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
    factoryCost: 0.60,
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
    factoryCost: 0.20,
    marginPercent: 40,
    flatMargin: 0.03,
    isActive: true,
    appliedScope: 'global'
  },
  
  // Shipping/Delivery
  {
    id: '14',
    productType: 'Regular Delivery',
    category: 'shipping',
    factoryCost: 2.00,
    marginPercent: 15,
    flatMargin: 0.50,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '15',
    productType: 'Priority Delivery',
    category: 'shipping',
    factoryCost: 2.20,
    marginPercent: 18,
    flatMargin: 0.60,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '16',
    productType: 'Air Freight',
    category: 'shipping',
    factoryCost: 1.00,
    marginPercent: 25,
    flatMargin: 0.20,
    isActive: true,
    appliedScope: 'global'
  },
  {
    id: '17',
    productType: 'Sea Freight',
    category: 'shipping',
    factoryCost: 0.35,
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
    
    let filteredSettings = marginSettings.filter(setting => setting.isActive);
    
    if (category && category !== 'all') {
      filteredSettings = filteredSettings.filter(setting => setting.category === category);
    }
    
    if (scope) {
      filteredSettings = filteredSettings.filter(setting => setting.appliedScope === scope);
    }
    
    return NextResponse.json({
      success: true,
      data: filteredSettings,
      categories: ['blank_caps', 'logos', 'accessories', 'closures', 'fabrics', 'applications', 'shipping']
    });
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
    const { settings, scope = 'global' } = body;
    
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
          factoryCost: newSetting.factoryCost || 0,
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

// Utility function to calculate partner cost
export function calculatePartnerCost(
  factoryCost: number,
  marginPercent: number,
  flatMargin: number
): number {
  return Math.max(0, factoryCost + (factoryCost * marginPercent / 100) + flatMargin);
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