import { NextRequest, NextResponse } from 'next/server';
// TODO: Remove Prisma - convert to Supabase
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  // TODO: Replace with Supabase query
  console.log('Shipment GET temporarily disabled - TODO: implement with Supabase');
  
  return NextResponse.json({
   error: 'Shipments temporarily unavailable due to database maintenance'
  }, { status: 503 });
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
  // TODO: Replace with Supabase update
  console.log('Shipment PUT temporarily disabled - TODO: implement with Supabase');
  
  return NextResponse.json({
   error: 'Shipment updates temporarily unavailable due to database maintenance'
  }, { status: 503 });
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
  // TODO: Replace with Supabase delete
  console.log('Shipment DELETE temporarily disabled - TODO: implement with Supabase');
  
  return NextResponse.json({
   error: 'Shipment deletion temporarily unavailable due to database maintenance'
  }, { status: 503 });
 } catch (error) {
  console.error('Error deleting shipment:', error);
  return NextResponse.json(
   { error: 'Failed to delete shipment' },
   { status: 500 }
  );
 }
}