import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
 try {
  const user = await requireAuth(request);

  // Get user statistics
  const [
   orderCount,
   pendingOrders,
   completedOrders,
   totalMessages,
   unreadMessages,
   recentOrders
  ] = await Promise.all([
   // Total orders
   prisma.order.count({
    where: { userId: user.id },
   }),
   // Pending orders
   prisma.order.count({
    where: { 
     userId: user.id,
     status: 'PENDING',
    },
   }),
   // Completed orders
   prisma.order.count({
    where: { 
     userId: user.id,
     status: { in: ['DELIVERED', 'CONFIRMED'] },
    },
   }),
   // Total messages
   prisma.message.count({
    where: {
     OR: [
      { fromUserId: user.id },
      { toUserId: user.id },
     ],
    },
   }),
   // Unread messages
   prisma.message.count({
    where: {
     toUserId: user.id,
     isRead: false,
    },
   }),
   // Recent orders (last 5)
   prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
     id: true,
     productName: true,
     status: true,
     createdAt: true,
    },
   }),
  ]);

  // Calculate total spending (simplified - in real app, you'd calculate from order totals)
  const orders = await prisma.order.findMany({
   where: { userId: user.id },
   select: { selectedColors: true },
  });

  let totalQuantity = 0;
  orders.forEach(order => {
   const colors = order.selectedColors as any;
   Object.values(colors).forEach((colorData: any) => {
    Object.values(colorData.sizes).forEach((qty: any) => {
     totalQuantity += parseInt(qty) || 0;
    });
   });
  });

  // Get user creation date for member since
  const userInfo = await prisma.user.findUnique({
   where: { id: user.id },
   select: {
    createdAt: true,
    lastLoginAt: true
   }
  });

  // Calculate total spent from orders with cost breakdown
  const ordersWithCosts = await prisma.order.findMany({
   where: { 
    userId: user.id,
    status: { in: ['DELIVERED', 'CONFIRMED', 'SHIPPED'] }
   },
   select: { 
    costBreakdown: true,
    orderTotal: true 
   },
  });

  let totalSpent = 0;
  ordersWithCosts.forEach(order => {
   if (order.orderTotal) {
    totalSpent += order.orderTotal;
   } else if (order.costBreakdown && typeof order.costBreakdown === 'object') {
    const breakdown = order.costBreakdown as any;
    if (breakdown.totalCost) {
     totalSpent += breakdown.totalCost;
    }
   }
  });

  return NextResponse.json({
   stats: {
    totalOrders: orderCount,
    pendingOrders,
    completedOrders,
    totalMessages,
    unreadMessages,
    totalQuantity,
    totalSpent,
    memberSince: userInfo?.createdAt?.toISOString() || new Date().toISOString(),
    lastLoginAt: userInfo?.lastLoginAt?.toISOString() || null,
   },
   recentOrders,
  });
 } catch (error: any) {
  if (error.message === 'Unauthorized') {
   return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
   );
  }
  console.error('Error fetching user stats:', error);
  return NextResponse.json(
   { error: 'Failed to fetch statistics' },
   { status: 500 }
  );
 }
}