import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeOrders = searchParams.get('includeOrders') === 'true';

    const shipments = await prisma.shipment.findMany({
      include: {
        orders: includeOrders ? {
          select: {
            id: true,
            productName: true,
            customerInfo: true,
            status: true,
            createdAt: true,
            selectedColors: true,
            selectedOptions: true,
            multiSelectOptions: true,
          }
        } : false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ shipments });
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      buildNumber,
      shippingMethod,
      estimatedDeparture,
      estimatedDelivery,
      notes,
      createdBy,
    } = body;

    // Validate required fields
    if (!buildNumber || !shippingMethod) {
      return NextResponse.json(
        { error: 'Build number and shipping method are required' },
        { status: 400 }
      );
    }

    // Check if build number already exists
    const existingShipment = await prisma.shipment.findUnique({
      where: { buildNumber },
    });

    if (existingShipment) {
      return NextResponse.json(
        { error: 'Build number already exists' },
        { status: 400 }
      );
    }

    const shipment = await prisma.shipment.create({
      data: {
        buildNumber,
        shippingMethod,
        estimatedDeparture: estimatedDeparture ? new Date(estimatedDeparture) : null,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        notes,
        createdBy,
      },
      include: {
        orders: {
          select: {
            id: true,
            productName: true,
            customerInfo: true,
            status: true,
            createdAt: true,
            selectedColors: true,
            selectedOptions: true,
            multiSelectOptions: true,
          }
        },
      },
    });

    return NextResponse.json({ shipment }, { status: 201 });
  } catch (error) {
    console.error('Error creating shipment:', error);
    return NextResponse.json(
      { error: 'Failed to create shipment' },
      { status: 500 }
    );
  }
}