import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
 try {
  const {
   email,
   accountType,
   wholesale = {},
   supplier = {}
  } = await request.json();

  console.log('Intake details for:', email, 'accountType:', accountType);

  if (!email || !accountType) {
   return NextResponse.json(
    { error: 'Email and account type are required' },
    { status: 400 }
   );
  }

  // Find the user by email
  const { data: user, error: userError } = await supabaseAdmin
   .from('User')
   .select('*')
   .eq('email', email)
   .single();

  if (userError || !user) {
   return NextResponse.json(
    { error: 'User not found' },
    { status: 404 }
   );
  }

  // Prepare update data based on account type
  const updateData: {
   customerRole: string;
   company?: string;
   preferences: Record<string, unknown>;
  } = {
   customerRole: 'RETAIL',
   preferences: {}
  };

  // Set customerRole based on account type
  switch (accountType.toUpperCase()) {
   case 'WHOLESALE':
    updateData.customerRole = 'WHOLESALE';
    updateData.company = wholesale.companyName;
    break;
   case 'SUPPLIER':
    updateData.customerRole = 'SUPPLIER'; 
    updateData.company = supplier.factoryName;
    break;
   default:
    updateData.customerRole = 'RETAIL';
  }

  // Store additional data in preferences JSON field
  const preferences = {
   accountType: accountType.toLowerCase(),
   notifications: true, // default
   emailUpdates: true, // default
   marketingEmails: true, // default
   ...(accountType.toUpperCase() === 'WHOLESALE' && {
    wholesale: {
     interestedProducts: wholesale.interestedProducts,
     businessType: wholesale.businessType,
     companyName: wholesale.companyName,
     estAnnualPurchase: wholesale.estAnnualPurchase,
     website: wholesale.website,
     taxId: wholesale.taxId
    }
   }),
   ...(accountType.toUpperCase() === 'SUPPLIER' && {
    supplier: {
     factoryName: supplier.factoryName,
     location: supplier.location,
     productCategories: supplier.productCategories,
     website: supplier.website,
     monthlyCapacity: supplier.monthlyCapacity,
     certifications: supplier.certifications
    }
   })
  };

  updateData.preferences = preferences;

  // Update user with intake data
  const { data: updatedUser, error: updateError } = await supabaseAdmin
   .from('User')
   .update(updateData)
   .eq('email', email)
   .select()
   .single();

  if (updateError) {
   console.error('Error updating user:', updateError);
   return NextResponse.json(
    { error: 'Failed to update user account details' },
    { status: 500 }
   );
  }

  console.log('User intake data updated for:', email, 'customerRole:', updatedUser.customerRole);

  return NextResponse.json({
   message: 'Account details updated successfully',
   accountType: updatedUser.customerRole
  });

 } catch (error) {
  console.error('Intake details error:', error);
  return NextResponse.json(
   { error: 'Failed to update account details' },
   { status: 500 }
  );
 }
}