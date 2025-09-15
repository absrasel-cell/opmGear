import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔧 [DEBUG] Adding missing 7-panel product...');

    // First, get the Tier 3 pricing tier ID
    const { data: tiers, error: tiersError } = await supabase
      .from('pricing_tiers')
      .select('*')
      .eq('tier_name', 'Tier 3')
      .single();

    if (tiersError || !tiers) {
      console.error('❌ [DEBUG] Error finding Tier 3:', tiersError);
      return NextResponse.json({ error: 'Tier 3 not found' }, { status: 500 });
    }

    // Add the missing 7-panel flat bill high profile structured product
    const newProduct = {
      name: '7P FlatFrame 7 HSCS',
      code: '7P_FLATFRAME_7_HSCS',
      profile: 'High',
      bill_shape: 'Flat',
      panel_count: 7,
      structure_type: 'Structured with Mono Lining',
      pricing_tier_id: tiers.id,
      is_active: true,
      nick_names: [
        '7-Panel Cap',
        'Festival Cap',
        'Fitted Cap',
        'Flatbill',
        'High Crown',
        'New Era 9FIFTY',
        'Pro Fit',
        'Richardson 168',
        'Snapback',
        'Streetwear Cap',
        'Structured Cap',
        'FlatFrame',
        '7P'
      ]
    };

    console.log('📝 [DEBUG] Inserting product:', newProduct);

    const { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert(newProduct)
      .select('*')
      .single();

    if (insertError) {
      console.error('❌ [DEBUG] Error inserting product:', insertError);

      // Check if product already exists
      if (insertError.code === '23505') { // Unique constraint violation
        console.log('ℹ️ [DEBUG] Product already exists, checking current data...');

        const { data: existingProduct, error: selectError } = await supabase
          .from('products')
          .select('*, pricing_tier:pricing_tiers(*)')
          .eq('code', '7P_FLATFRAME_7_HSCS')
          .single();

        if (existingProduct) {
          return NextResponse.json({
            message: 'Product already exists',
            product: existingProduct
          });
        }
      }

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('✅ [DEBUG] Successfully added missing product:', insertedProduct);

    return NextResponse.json({
      message: 'Successfully added missing 7-panel product',
      product: insertedProduct
    });

  } catch (error) {
    console.error('❌ [DEBUG] Failed to add missing product:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}