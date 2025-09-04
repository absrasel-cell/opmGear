import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get the most recent shipment that's either PREPARING or READY_TO_SHIP
    const currentShipment = await prisma.shipment.findFirst({
      where: {
        status: {
          in: ['PREPARING', 'READY_TO_SHIP']
        }
      },
      select: {
        buildNumber: true,
        status: true,
        shippingMethod: true,
        estimatedDeparture: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      shipment: currentShipment
    });
    
  } catch (error) {
    console.error('Error fetching current shipping build:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch current shipping build',
        shipment: null
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}