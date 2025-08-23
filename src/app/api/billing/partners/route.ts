import { NextRequest, NextResponse } from 'next/server';

export interface Partner {
  id: string;
  name: string;
  userId: string;
  email: string;
  role: 'Partner' | 'Admin' | 'Reseller';
  status: 'Active' | 'Pending' | 'Suspended';
  createdAt: string;
  updatedAt: string;
  // Margin overrides for this specific partner
  marginOverrides?: {
    [productTypeId: string]: {
      marginPercent: number;
      flatMargin: number;
      isActive: boolean;
    };
  };
  // Partner-specific settings
  settings?: {
    defaultPaymentTerms?: string;
    defaultDiscountPercent?: number;
    defaultDiscountFlat?: number;
    creditLimit?: number;
    preferredCurrency?: string;
  };
}

// Mock data - in production this would be stored in database and synced with User table
const partners: Partner[] = [
  {
    id: '1',
    name: 'OPM Gear',
    userId: 'usr_og_01',
    email: 'ops@opmgear.com',
    role: 'Admin',
    status: 'Active',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date().toISOString(),
    settings: {
      defaultPaymentTerms: 'Net 30',
      defaultDiscountPercent: 10,
      creditLimit: 50000,
      preferredCurrency: 'USD'
    }
  },
  {
    id: '2',
    name: 'US Custom Caps',
    userId: 'usr_us_02',
    email: 'support@uscc.com',
    role: 'Partner',
    status: 'Pending',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    settings: {
      defaultPaymentTerms: 'Net 15',
      defaultDiscountPercent: 5,
      creditLimit: 25000,
      preferredCurrency: 'USD'
    }
  },
  {
    id: '3',
    name: 'CBC',
    userId: 'usr_cbc_03',
    email: 'hello@cbc.com',
    role: 'Reseller',
    status: 'Active',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    marginOverrides: {
      '1': { marginPercent: 15, flatMargin: 0, isActive: true }, // Custom margin for Blank Caps
      '2': { marginPercent: 30, flatMargin: 0.03, isActive: true } // Custom margin for 3D Embroidery
    },
    settings: {
      defaultPaymentTerms: 'Due on receipt',
      defaultDiscountPercent: 2.5,
      creditLimit: 15000,
      preferredCurrency: 'USD'
    }
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const partnerId = searchParams.get('id');
    
    // Get single partner
    if (partnerId) {
      const partner = partners.find(p => p.id === partnerId);
      if (!partner) {
        return NextResponse.json(
          { success: false, error: 'Partner not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: partner
      });
    }
    
    // Filter partners
    let filteredPartners = [...partners];
    
    if (status && status !== 'all') {
      filteredPartners = filteredPartners.filter(p => p.status === status);
    }
    
    if (role && role !== 'all') {
      filteredPartners = filteredPartners.filter(p => p.role === role);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPartners = filteredPartners.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower) ||
        p.userId.toLowerCase().includes(searchLower)
      );
    }
    
    return NextResponse.json({
      success: true,
      data: filteredPartners,
      summary: {
        total: partners.length,
        active: partners.filter(p => p.status === 'Active').length,
        pending: partners.filter(p => p.status === 'Pending').length,
        suspended: partners.filter(p => p.status === 'Suspended').length,
        byRole: {
          admin: partners.filter(p => p.role === 'Admin').length,
          partner: partners.filter(p => p.role === 'Partner').length,
          reseller: partners.filter(p => p.role === 'Reseller').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      userId,
      email,
      role = 'Partner',
      status = 'Active',
      settings = {}
    } = body;
    
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }
    
    // Check if partner with same email already exists
    const existingPartner = partners.find(p => p.email === email);
    if (existingPartner) {
      return NextResponse.json(
        { success: false, error: 'Partner with this email already exists' },
        { status: 409 }
      );
    }
    
    const newPartner: Partner = {
      id: `partner_${Date.now()}`,
      name,
      userId: userId || `usr_${Math.random().toString(36).substring(2, 7)}`,
      email,
      role: role as Partner['role'],
      status: status as Partner['status'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        defaultPaymentTerms: 'Net 30',
        defaultDiscountPercent: 0,
        defaultDiscountFlat: 0,
        creditLimit: 10000,
        preferredCurrency: 'USD',
        ...settings
      }
    };
    
    partners.push(newPartner);
    
    return NextResponse.json({
      success: true,
      message: 'Partner created successfully',
      data: newPartner
    });
  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Partner ID is required' },
        { status: 400 }
      );
    }
    
    const partnerIndex = partners.findIndex(p => p.id === id);
    
    if (partnerIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    // Update partner
    const updatedPartner: Partner = {
      ...partners[partnerIndex],
      ...body,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };
    
    partners[partnerIndex] = updatedPartner;
    
    return NextResponse.json({
      success: true,
      message: 'Partner updated successfully',
      data: updatedPartner
    });
  } catch (error) {
    console.error('Error updating partner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update partner' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Partner ID is required' },
        { status: 400 }
      );
    }
    
    const partnerIndex = partners.findIndex(p => p.id === id);
    
    if (partnerIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    // Remove partner from array
    const deletedPartner = partners.splice(partnerIndex, 1)[0];
    
    return NextResponse.json({
      success: true,
      message: 'Partner deleted successfully',
      data: deletedPartner
    });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete partner' },
      { status: 500 }
    );
  }
}

// Utility function to get partner-specific margin for a product type
export function getPartnerMargin(
  partnerId: string,
  productTypeId: string,
  defaultMarginPercent: number,
  defaultFlatMargin: number
): { marginPercent: number; flatMargin: number } {
  const partner = partners.find(p => p.id === partnerId);
  
  if (partner?.marginOverrides?.[productTypeId]?.isActive) {
    const override = partner.marginOverrides[productTypeId];
    return {
      marginPercent: override.marginPercent,
      flatMargin: override.flatMargin
    };
  }
  
  return {
    marginPercent: defaultMarginPercent,
    flatMargin: defaultFlatMargin
  };
}

// Utility function to calculate partner cost with specific margins
export function calculatePartnerSpecificCost(
  partnerId: string,
  productTypeId: string,
  factoryCost: number,
  defaultMarginPercent: number,
  defaultFlatMargin: number
): number {
  const margin = getPartnerMargin(partnerId, productTypeId, defaultMarginPercent, defaultFlatMargin);
  return Math.max(0, factoryCost + (factoryCost * margin.marginPercent / 100) + margin.flatMargin);
}