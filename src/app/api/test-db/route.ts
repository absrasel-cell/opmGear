import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const userCount = await prisma.user.count();
    const orderCount = await prisma.order.count();
    const quoteCount = await prisma.quote.count();

    // Test OrderAsset table
    let orderAssetCount = 0;
    let orderAssetError = null;
    try {
      orderAssetCount = await prisma.orderAsset.count();
    } catch (error) {
      orderAssetError = error.message;
    }

    // Get sample data
    const sampleUsers = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        accessRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const sampleOrders = await prisma.order.findMany({
      take: 5,
      select: {
        id: true,
        productName: true,
        status: true,
        createdAt: true,
        customerInfo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const sampleQuotes = await prisma.quote.findMany({
      take: 5,
      select: {
        id: true,
        productName: true,
        status: true,
        createdAt: true,
        customerInfo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      counts: {
        users: userCount,
        orders: orderCount,
        quotes: quoteCount,
        orderAssets: orderAssetCount,
      },
      orderAssetError: orderAssetError,
      sampleData: {
        users: sampleUsers,
        orders: sampleOrders,
        quotes: sampleQuotes,
      },
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}