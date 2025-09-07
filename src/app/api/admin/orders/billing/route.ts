import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
// Removed Prisma - migrated to Supabase

export async function GET(request: NextRequest) {
 try {
  // Check admin permissions
  const { user, profile } = await requireAdmin(request);
  
  const { searchParams } = new URL(request.url);
  const customer = searchParams.get('customer');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // Build where clause for filtering
  const where: any = {};
  
  // Filter by status - only show orders that could be billed
  if (status && status !== 'all') {
   where.status = status;
  } else {
   // Default: show orders that are ready for billing
   where.status = {
    in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
   };
  }

  // Filter by customer if specified
  if (customer && customer !== 'all') {
   where.OR = [
    { user: { name: { contains: customer, mode: 'insensitive' } } },
    { user: { company: { contains: customer, mode: 'insensitive' } } },
    { customerInfo: { path: ['name'], string_contains: customer } }
   ];
  }

  // Get orders with customer info and existing invoices
  const [orders, total] = await Promise.all([
   prisma.order.findMany({
    where,
    include: {
     user: {
      select: {
       id: true,
       name: true,
       email: true,
       company: true,
       customerRole: true
      }
     },
     invoices: {
      select: {
       id: true,
       number: true,
       status: true,
       total: true,
       createdAt: true
      }
     }
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit
   }),
   prisma.order.count({ where })
  ]);

  // Transform orders for billing display
  const transformedOrders = orders.map(order => {
   // Extract customer info from either user or customerInfo JSON
   let customerName = 'Guest Customer';
   let customerEmail = '';
   let customerCompany = '';
   
   if (order.user) {
    customerName = order.user.name || 'Unnamed Customer';
    customerEmail = order.user.email;
    customerCompany = order.user.company || '';
   } else if (order.customerInfo) {
    const custInfo = order.customerInfo as any;
    customerName = custInfo.name || 'Guest Customer';
    customerEmail = custInfo.email || '';
    customerCompany = custInfo.company || '';
   }

   // Calculate estimated factory cost from order data
   let estimatedFactoryCost = 0;
   
   // Basic cost calculation from selectedColors (quantities)
   if (order.selectedColors && typeof order.selectedColors === 'object') {
    const colors = order.selectedColors as Record<string, { sizes: Record<string, number> }>;
    let totalQuantity = 0;
    
    Object.values(colors).forEach(color => {
     if (color.sizes) {
      Object.values(color.sizes).forEach(qty => {
       totalQuantity += qty || 0;
      });
     }
    });
    
    // Estimate factory cost at $3.50 per unit base + options
    estimatedFactoryCost = totalQuantity * 3.50;
    
    // Add estimated costs for options
    if (order.selectedOptions) {
     const options = order.selectedOptions as Record<string, any>;
     if (options.closure && options.closure !== 'standard') estimatedFactoryCost += totalQuantity * 0.25;
     if (options.visor && options.visor !== 'standard') estimatedFactoryCost += totalQuantity * 0.15;
    }
    
    // Add logo costs if present
    if (order.logoSetupSelections || order.uploadedLogoFiles) {
     estimatedFactoryCost += totalQuantity * 0.75; // Logo setup cost
    }
   }

   return {
    id: order.id,
    customer: customerCompany ? `${customerName} (${customerCompany})` : customerName,
    customerEmail,
    items: calculateTotalItems(order.selectedColors),
    factory: estimatedFactoryCost,
    due: order.updatedAt.toISOString(),
    status: order.status,
    productName: order.productName,
    hasInvoice: order.invoices.length > 0,
    invoices: order.invoices,
    orderType: order.orderType,
    createdAt: order.createdAt.toISOString()
   };
  });

  return NextResponse.json({
   orders: transformedOrders,
   pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
   }
  });

 } catch (error: any) {
  console.error('Error fetching billing orders:', error);
  
  if (error.message === 'Unauthorized') {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  if (error.message?.includes('Admin access required')) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
 }
}

// Helper function to calculate total items from selectedColors
function calculateTotalItems(selectedColors: any): number {
 if (!selectedColors || typeof selectedColors !== 'object') {
  return 0;
 }

 let totalItems = 0;
 Object.values(selectedColors).forEach((color: any) => {
  if (color && color.sizes && typeof color.sizes === 'object') {
   Object.values(color.sizes).forEach((qty: any) => {
    totalItems += Number(qty) || 0;
   });
  }
 });

 return totalItems;
}