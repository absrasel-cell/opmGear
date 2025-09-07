import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the most recent shipment that's either PREPARING or READY_TO_SHIP
    const { data: currentShipment, error } = await supabase
      .from('Shipment')
      .select('buildNumber, status, shippingMethod, estimatedDeparture')
      .in('status', ['PREPARING', 'READY_TO_SHIP'])
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

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
  }
}