import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

async function getCurrentUser(_request: NextRequest) {
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
  return user;
 } catch (error) {
  return null;
 }
}

export async function GET(request: NextRequest) {
 try {
  console.log('Export API: Starting export request');
  
  const currentUser = await getCurrentUser(request);
  console.log('Export API: Current user:', currentUser?.email || 'None');

  if (!currentUser) {
   console.log('Export API: No current user found');
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  console.log('Export API: Checking user role in database');
  const { data: dbUser, error: userError } = await supabaseAdmin
    .from('users')
    .select('accessRole')
    .eq('email', currentUser.email!)
    .single();

  if (userError) {
    console.error('Export API: Error fetching user:', userError);
  }
  console.log('Export API: User access role:', dbUser?.accessRole || 'User not found in database');

  if (!dbUser?.accessRole || !['STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(dbUser.accessRole)) {
   console.log('Export API: User is not admin, access denied');
   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // Fetch all orders with related data
  console.log('Export API: Fetching orders from database');
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      user:users!orders_userId_fkey(
        email,
        name,
        phone,
        company
      )
    `)
    .order('createdAt', { ascending: false });

  if (ordersError) {
    console.error('Export API: Error fetching orders:', ordersError);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  console.log('Export API: Found', orders?.length || 0, 'orders');

  // Convert orders to CSV format
  const csvHeaders = [
   'Order ID',
   'Customer Email',
   'Customer Name',
   'Company',
   'Phone',
   'Status',
   'Total Amount',
   'Order Date',
   'Product Details',
   'Shipping Address',
   'Billing Address',
   'Notes'
  ];

  const csvRows = (orders || []).map(order => [
   order.id,
   order.user?.email || 'N/A',
   order.user?.name || 'N/A',
   order.user?.company || 'N/A',
   order.user?.phone || 'N/A',
   order.status,
   '0', // totalAmount field doesn't exist in schema, set to 0
   order.createdAt.toISOString().split('T')[0], // Date only
   JSON.stringify(order.selectedColors) || 'N/A', // Convert JSON to string
   JSON.stringify((order.customerInfo as any)?.address) || 'N/A', // Extract address from customerInfo
   JSON.stringify((order.customerInfo as any)?.address) || 'N/A', // Use same address for billing
   order.additionalInstructions || 'N/A'
  ]);

  // Create CSV content
  const csvContent = [
   csvHeaders.join(','),
   ...csvRows.map(row => 
    row.map(field => 
     // Escape fields that contain commas, quotes, or newlines
     typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
      ? `"${field.replace(/"/g, '""')}"` 
      : field
    ).join(',')
   )
  ].join('\n');

  // Set headers for CSV download
  console.log('Export API: Returning CSV file with', csvRows.length, 'rows');
  return new NextResponse(csvContent, {
   status: 200,
   headers: {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename=orders_export_${new Date().toISOString().split('T')[0]}.csv`
   }
  });

 } catch (error) {
  console.error('Export API: Error occurred:', error);
  // Log the full error details for debugging
  if (error instanceof Error) {
   console.error('Export API: Error name:', error.name);
   console.error('Export API: Error message:', error.message);
   console.error('Export API: Error stack:', error.stack);
  }
  return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
 }
}