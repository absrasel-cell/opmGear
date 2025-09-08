import { NextRequest, NextResponse } from 'next/server';
// Removed Prisma - migrated to Supabase
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Helper function to get current user
async function getCurrentUser(request: NextRequest) {
 try {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) return null;

  const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
   {
    global: {
     headers: {
      Authorization: `Bearer ${accessToken}`,
     },
    },
   }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  // Get user data from database to check access role
  const { data: userData, error: userError } = await supabase
    .from('User')
    .select('id, email, accessRole, adminLevel')
    .eq('id', user.id)
    .single();

  if (userError) {
    console.error('User data fetch error:', userError);
    return null;
  }
  
  return userData;
 } catch (error) {
  console.error('Authentication error:', error);
  return null;
 }
}

// Helper function to check admin access
function hasAdminAccess(user: any): boolean {
 if (!user) return false;
 return ['MASTER_ADMIN', 'SUPER_ADMIN', 'STAFF', 'ADMIN'].includes(user.accessRole);
}

// GET - Fetch all pricing tiers
export async function GET(request: NextRequest) {
 try {
  const { data: pricingTiers, error: fetchError } = await supabase
    .from('PricingTier')
    .select('*')
    .eq('isActive', true)
    .order('name', { ascending: true });

  if (fetchError) {
    console.error('Error fetching pricing tiers:', fetchError);
    return NextResponse.json(
      { error: 'Failed to fetch pricing tiers' },
      { status: 500 }
    );
  }

  return NextResponse.json(pricingTiers);
 } catch (error) {
  console.error('Error fetching pricing tiers:', error);
  return NextResponse.json(
   { error: 'Failed to fetch pricing tiers' },
   { status: 500 }
  );
 }
}

// POST - Create new pricing tier
export async function POST(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  if (!hasAdminAccess(user)) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, price48, price144, price576, price1152, price2880, price10000, isDefault } = body;

  // If setting as default, remove default from all others
  if (isDefault) {
    const { error: updateError } = await supabase
      .from('PricingTier')
      .update({ isDefault: false })
      .eq('isDefault', true);

    if (updateError) {
      console.error('Error updating default tiers:', updateError);
      return NextResponse.json(
        { error: 'Failed to update default tiers' },
        { status: 500 }
      );
    }
  }

  const { data: pricingTier, error: createError } = await supabase
    .from('PricingTier')
    .insert({
      name,
      price48: parseFloat(price48),
      price144: parseFloat(price144),
      price576: parseFloat(price576),
      price1152: parseFloat(price1152),
      price2880: parseFloat(price2880),
      price10000: parseFloat(price10000),
      isDefault: isDefault || false,
      isActive: true
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating pricing tier:', createError);
    return NextResponse.json(
      { error: 'Failed to create pricing tier' },
      { status: 500 }
    );
  }

  return NextResponse.json(pricingTier, { status: 201 });
 } catch (error) {
  console.error('Error creating pricing tier:', error);
  return NextResponse.json(
   { error: 'Failed to create pricing tier' },
   { status: 500 }
  );
 }
}

// PUT - Update pricing tier
export async function PUT(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  if (!hasAdminAccess(user)) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, price48, price144, price576, price1152, price2880, price10000, isDefault } = body;

  // If setting as default, remove default from all others
  if (isDefault) {
    const { error: updateError } = await supabase
      .from('PricingTier')
      .update({ isDefault: false })
      .eq('isDefault', true)
      .neq('id', id);

    if (updateError) {
      console.error('Error updating default tiers:', updateError);
      return NextResponse.json(
        { error: 'Failed to update default tiers' },
        { status: 500 }
      );
    }
  }

  const { data: pricingTier, error: updateTierError } = await supabase
    .from('PricingTier')
    .update({
      name,
      price48: parseFloat(price48),
      price144: parseFloat(price144),
      price576: parseFloat(price576),
      price1152: parseFloat(price1152),
      price2880: parseFloat(price2880),
      price10000: parseFloat(price10000),
      isDefault: isDefault || false
    })
    .eq('id', id)
    .select()
    .single();

  if (updateTierError) {
    console.error('Error updating pricing tier:', updateTierError);
    return NextResponse.json(
      { error: 'Failed to update pricing tier' },
      { status: 500 }
    );
  }

  return NextResponse.json(pricingTier);
 } catch (error) {
  console.error('Error updating pricing tier:', error);
  return NextResponse.json(
   { error: 'Failed to update pricing tier' },
   { status: 500 }
  );
 }
}

// DELETE - Delete pricing tier
export async function DELETE(request: NextRequest) {
 try {
  const user = await getCurrentUser(request);
  if (!hasAdminAccess(user)) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
   return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Check if this is the default tier
  const { data: tier, error: tierError } = await supabase
    .from('PricingTier')
    .select('isDefault')
    .eq('id', id)
    .single();

  if (tierError) {
    console.error('Error fetching tier:', tierError);
    return NextResponse.json(
      { error: 'Failed to fetch tier' },
      { status: 500 }
    );
  }
  if (tier?.isDefault) {
   return NextResponse.json(
    { error: 'Cannot delete default pricing tier' },
    { status: 400 }
   );
  }

  const { error: deleteError } = await supabase
    .from('PricingTier')
    .update({ isActive: false })
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting pricing tier:', deleteError);
    return NextResponse.json(
      { error: 'Failed to delete pricing tier' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
 } catch (error) {
  console.error('Error deleting pricing tier:', error);
  return NextResponse.json(
   { error: 'Failed to delete pricing tier' },
   { status: 500 }
  );
 }
}