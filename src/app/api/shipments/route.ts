import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const includeOrders = searchParams.get('includeOrders') === 'true';

  const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
   .from('Shipment')
   .select('*')
   .order('createdAt', { ascending: false });

  if (includeOrders) {
   query = supabase
    .from('Shipment')
    .select(`
     *,
     orders:Order(
      id,
      productName,
      customerInfo,
      status,
      createdAt,
      selectedColors,
      selectedOptions,
      multiSelectOptions
     )
    `)
    .order('createdAt', { ascending: false });
  }

  const { data: shipments, error } = await query;

  if (error) {
   throw error;
  }

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

  const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if build number already exists
  const { data: existingShipment } = await supabase
   .from('Shipment')
   .select('buildNumber')
   .eq('buildNumber', buildNumber)
   .single();

  if (existingShipment) {
   return NextResponse.json(
    { error: 'Build number already exists' },
    { status: 400 }
   );
  }

  const shipmentData = {
   id: `ship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
   buildNumber,
   shippingMethod,
   estimatedDeparture: estimatedDeparture ? new Date(estimatedDeparture).toISOString() : null,
   estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
   notes,
   createdBy,
   updatedAt: new Date().toISOString(),
  };

  const { data: shipment, error } = await supabase
   .from('Shipment')
   .insert([shipmentData])
   .select(`
    *,
    orders:Order(
     id,
     productName,
     customerInfo,
     status,
     createdAt,
     selectedColors,
     selectedOptions,
     multiSelectOptions
    )
   `)
   .single();

  if (error) {
   throw error;
  }

  return NextResponse.json({ shipment }, { status: 201 });
 } catch (error) {
  console.error('Error creating shipment:', error);
  return NextResponse.json(
   { error: 'Failed to create shipment' },
   { status: 500 }
  );
 }
}