import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
// Removed Prisma - migrated to Supabase

export async function GET(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  
  if (!user) {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Verify admin access
  const userProfile = await prisma.user.findUnique({
   where: { id: user.id },
   select: { accessRole: true, email: true }
  });

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF'].includes(userProfile?.accessRole || '') ||
          userProfile?.email === 'absrasel@gmail.com';

  if (!isAdmin) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const email = searchParams.get('email');
  const includeOrders = searchParams.get('includeOrders') === 'true';
  const includeMessages = searchParams.get('includeMessages') === 'true';

  if (!customerId && !email) {
   return NextResponse.json({ error: 'Customer ID or email required' }, { status: 400 });
  }

  // Build where clause
  const whereClause = customerId ? { id: customerId } : { email: email };

  // Get customer data with related information
  const customer = await prisma.user.findUnique({
   where: whereClause,
   select: {
    id: true,
    name: true,
    email: true,
    customerRole: true,
    accessRole: true,
    createdAt: true,
    updatedAt: true,
    // Include orders if requested
    ...(includeOrders && {
     orders: {
      select: {
       id: true,
       productName: true,
       status: true,
       totalUnits: true,
       calculatedTotal: true,
       createdAt: true,
       trackingNumber: true,
       deliveryDate: true,
       priceTier: true,
       specialInstructions: true,
       productDetails: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
     }
    }),
    // Include messages if requested
    ...(includeMessages && {
     sentMessages: {
      select: {
       id: true,
       content: true,
       category: true,
       priority: true,
       createdAt: true,
       isRead: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
     }
    })
   }
  });

  if (!customer) {
   return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Calculate customer statistics
  let customerStats = {};
  if (includeOrders && customer.orders) {
   const orders = customer.orders as any[];
   const totalSpent = orders.reduce((sum, order) => sum + (order.calculatedTotal || 0), 0);
   const totalOrders = orders.length;
   const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
   
   const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
   }, {} as Record<string, number>);

   const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null;

   customerStats = {
    totalSpent,
    totalOrders,
    averageOrderValue,
    ordersByStatus,
    lastOrderDate,
    lifetimeValue: totalSpent
   };
  }

  return NextResponse.json({
   customer,
   statistics: customerStats,
   adminNote: 'Customer data accessed by admin AI system'
  });

 } catch (error) {
  console.error('Internal API Error - Admin Customer Data:', error);
  return NextResponse.json(
   { error: 'Failed to retrieve customer data' },
   { status: 500 }
  );
 }
}

export async function PUT(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  
  if (!user) {
   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Verify admin access
  const userProfile = await prisma.user.findUnique({
   where: { id: user.id },
   select: { accessRole: true, email: true }
  });

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF'].includes(userProfile?.accessRole || '') ||
          userProfile?.email === 'absrasel@gmail.com';

  if (!isAdmin) {
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { customerId, updates } = await request.json();

  if (!customerId) {
   return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
  }

  // Update customer data (admin can modify roles, etc.)
  const updatedCustomer = await prisma.user.update({
   where: { id: customerId },
   data: {
    ...updates,
    updatedAt: new Date()
   },
   select: {
    id: true,
    name: true,
    email: true,
    customerRole: true,
    accessRole: true,
    updatedAt: true
   }
  });

  return NextResponse.json({
   success: true,
   customer: updatedCustomer,
   message: 'Customer data updated successfully'
  });

 } catch (error) {
  console.error('Internal API Error - Admin Customer Update:', error);
  return NextResponse.json(
   { error: 'Failed to update customer data' },
   { status: 500 }
  );
 }
}