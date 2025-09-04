import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  const shipment = await prisma.shipment.findUnique({
   where: { id: params.id },
   include: {
    orders: {
     select: {
      id: true,
      productName: true,
      customerInfo: true,
      status: true,
      orderSource: true,
      createdAt: true,
      updatedAt: true,
      selectedColors: true,
      selectedOptions: true,
      multiSelectOptions: true,
     }
    },
   },
  });

  if (!shipment) {
   return NextResponse.json(
    { error: 'Shipment not found' },
    { status: 404 }
   );
  }

  return NextResponse.json({ shipment });
 } catch (error) {
  console.error('Error fetching shipment:', error);
  return NextResponse.json(
   { error: 'Failed to fetch shipment' },
   { status: 500 }
  );
 }
}

export async function PUT(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  const body = await request.json();
  const {
   buildNumber,
   shippingMethod,
   estimatedDeparture,
   estimatedDelivery,
   actualDeparture,
   actualDelivery,
   status,
   notes,
  } = body;

  // Check if shipment exists
  const existingShipment = await prisma.shipment.findUnique({
   where: { id: params.id },
  });

  if (!existingShipment) {
   return NextResponse.json(
    { error: 'Shipment not found' },
    { status: 404 }
   );
  }

  // If build number is being changed, check if new number already exists
  if (buildNumber && buildNumber !== existingShipment.buildNumber) {
   const duplicateShipment = await prisma.shipment.findUnique({
    where: { buildNumber },
   });

   if (duplicateShipment) {
    return NextResponse.json(
     { error: 'Build number already exists' },
     { status: 400 }
    );
   }
  }

  const updateData: any = {};
  if (buildNumber !== undefined) updateData.buildNumber = buildNumber;
  if (shippingMethod !== undefined) updateData.shippingMethod = shippingMethod;
  if (estimatedDeparture !== undefined) updateData.estimatedDeparture = estimatedDeparture ? new Date(estimatedDeparture) : null;
  if (estimatedDelivery !== undefined) updateData.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
  if (actualDeparture !== undefined) updateData.actualDeparture = actualDeparture ? new Date(actualDeparture) : null;
  if (actualDelivery !== undefined) updateData.actualDelivery = actualDelivery ? new Date(actualDelivery) : null;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const shipment = await prisma.shipment.update({
   where: { id: params.id },
   data: updateData,
   include: {
    orders: {
     select: {
      id: true,
      productName: true,
      customerInfo: true,
      status: true,
      orderSource: true,
      createdAt: true,
      updatedAt: true,
      selectedColors: true,
      selectedOptions: true,
      multiSelectOptions: true,
     }
    },
   },
  });

  return NextResponse.json({ shipment });
 } catch (error) {
  console.error('Error updating shipment:', error);
  return NextResponse.json(
   { error: 'Failed to update shipment' },
   { status: 500 }
  );
 }
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  // Check if shipment exists
  const existingShipment = await prisma.shipment.findUnique({
   where: { id: params.id },
   include: {
    orders: true,
   },
  });

  if (!existingShipment) {
   return NextResponse.json(
    { error: 'Shipment not found' },
    { status: 404 }
   );
  }

  // Unassign all orders from this shipment first
  await prisma.order.updateMany({
   where: { shipmentId: params.id },
   data: { shipmentId: null },
  });

  // Delete the shipment
  await prisma.shipment.delete({
   where: { id: params.id },
  });

  return NextResponse.json({ 
   message: 'Shipment deleted successfully',
   unassignedOrders: existingShipment.orders.length
  });
 } catch (error) {
  console.error('Error deleting shipment:', error);
  return NextResponse.json(
   { error: 'Failed to delete shipment' },
   { status: 500 }
  );
 }
}