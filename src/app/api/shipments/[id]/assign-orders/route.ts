import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  const body = await request.json();
  const { orderIds } = body;

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
   return NextResponse.json(
    { error: 'Order IDs array is required' },
    { status: 400 }
   );
  }

  // Check if shipment exists
  const shipment = await prisma.shipment.findUnique({
   where: { id: params.id },
  });

  if (!shipment) {
   return NextResponse.json(
    { error: 'Shipment not found' },
    { status: 404 }
   );
  }

  // Check if all orders exist and are not already assigned to a different shipment
  const orders = await prisma.order.findMany({
   where: { id: { in: orderIds } },
   select: { 
    id: true, 
    shipmentId: true, 
    productName: true,
    customerInfo: true,
    status: true
   },
  });

  if (orders.length !== orderIds.length) {
   return NextResponse.json(
    { error: 'Some orders were not found' },
    { status: 400 }
   );
  }

  const alreadyAssigned = orders.filter(order => 
   order.shipmentId && order.shipmentId !== params.id
  );

  if (alreadyAssigned.length > 0) {
   return NextResponse.json(
    { 
     error: 'Some orders are already assigned to other shipments',
     alreadyAssignedOrders: alreadyAssigned.map(order => ({
      id: order.id,
      productName: order.productName,
      shipmentId: order.shipmentId
     }))
    },
    { status: 400 }
   );
  }

  // Assign orders to shipment
  const updatedOrders = await prisma.order.updateMany({
   where: { id: { in: orderIds } },
   data: { shipmentId: params.id },
  });

  // Get updated shipment with orders
  const updatedShipment = await prisma.shipment.findUnique({
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
     }
    },
   },
  });

  return NextResponse.json({ 
   shipment: updatedShipment,
   assignedCount: updatedOrders.count
  });
 } catch (error) {
  console.error('Error assigning orders to shipment:', error);
  return NextResponse.json(
   { error: 'Failed to assign orders to shipment' },
   { status: 500 }
  );
 }
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  const body = await request.json();
  const { orderIds } = body;

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
   return NextResponse.json(
    { error: 'Order IDs array is required' },
    { status: 400 }
   );
  }

  // Check if shipment exists
  const shipment = await prisma.shipment.findUnique({
   where: { id: params.id },
  });

  if (!shipment) {
   return NextResponse.json(
    { error: 'Shipment not found' },
    { status: 404 }
   );
  }

  // Unassign orders from shipment
  const updatedOrders = await prisma.order.updateMany({
   where: { 
    id: { in: orderIds },
    shipmentId: params.id
   },
   data: { shipmentId: null },
  });

  // Get updated shipment with orders
  const updatedShipment = await prisma.shipment.findUnique({
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
     }
    },
   },
  });

  return NextResponse.json({ 
   shipment: updatedShipment,
   unassignedCount: updatedOrders.count
  });
 } catch (error) {
  console.error('Error unassigning orders from shipment:', error);
  return NextResponse.json(
   { error: 'Failed to unassign orders from shipment' },
   { status: 500 }
  );
 }
}