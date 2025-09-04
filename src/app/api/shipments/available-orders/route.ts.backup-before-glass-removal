import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const shipmentId = searchParams.get('shipmentId');

    console.log('🔍 API: Fetching orders with params:', { status, search, shipmentId });

    // Build where clause
    const where: any = {
      AND: []
    };
    
    // Shipment filter: either unassigned or assigned to the specified shipment
    if (shipmentId) {
      where.AND.push({
        OR: [
          { shipmentId: null },
          { shipmentId: shipmentId }
        ]
      });
    } else {
      where.AND.push({ shipmentId: null });
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      where.AND.push({ status: status.toUpperCase() });
    }

    // Search functionality
    if (search) {
      where.AND.push({
        OR: [
          { id: { contains: search, mode: 'insensitive' as const } },
          { productName: { contains: search, mode: 'insensitive' as const } },
          { userEmail: { contains: search, mode: 'insensitive' as const } }
        ]
      });
    }

    console.log('🔍 API: Final where clause:', JSON.stringify(where, null, 2));

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        productName: true,
        customerInfo: true,
        status: true,
        orderSource: true,
        orderType: true,
        createdAt: true,
        updatedAt: true,
        shipmentId: true,
        userEmail: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('📦 API: Found', orders.length, 'orders');
    console.log('📦 API: Orders with shipmentId:', orders.filter(o => o.shipmentId).length);
    if (shipmentId) {
      console.log('📦 API: Orders for this shipment:', orders.filter(o => o.shipmentId === shipmentId).length);
    }

    // Calculate statistics
    const stats = {
      total: orders.length,
      unassigned: orders.filter(order => !order.shipmentId).length,
      pending: orders.filter(order => order.status === 'PENDING').length,
      processing: orders.filter(order => order.status === 'PROCESSING').length,
      confirmed: orders.filter(order => order.status === 'CONFIRMED').length,
    };

    return NextResponse.json({ orders, stats });
  } catch (error) {
    console.error('Error fetching available orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available orders' },
      { status: 500 }
    );
  }
}