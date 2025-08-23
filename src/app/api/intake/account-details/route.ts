import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare update data based on account type
    const updateData: {
      role: string;
      company?: string;
      preferences: Record<string, unknown>;
    } = {
      role: 'MEMBER',
      preferences: {}
    };

    // Set role based on account type
    switch (accountType.toUpperCase()) {
      case 'WHOLESALE':
        updateData.role = 'WHOLESALE';
        updateData.company = wholesale.companyName;
        break;
      case 'SUPPLIER':
        updateData.role = 'SUPPLIER';  
        updateData.company = supplier.factoryName;
        break;
      default:
        updateData.role = 'MEMBER';
    }

    // Store additional data in preferences JSON field
    const preferences = {
      accountType: accountType.toLowerCase(),
      notifications: true, // default
      emailUpdates: true, // default
      marketingEmails: true, // default
      ...(accountType === 'Wholesale' && {
        wholesale: {
          interestedProducts: wholesale.interestedProducts,
          businessType: wholesale.businessType,
          companyName: wholesale.companyName,
          estAnnualPurchase: wholesale.estAnnualPurchase,
          website: wholesale.website,
          taxId: wholesale.taxId
        }
      }),
      ...(accountType === 'Supplier' && {
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
    const updatedUser = await prisma.user.update({
      where: { email },
      data: updateData
    });

    console.log('User intake data updated for:', email, 'role:', updatedUser.role);

    return NextResponse.json({
      message: 'Account details updated successfully',
      accountType: updatedUser.role
    });

  } catch (error) {
    console.error('Intake details error:', error);
    return NextResponse.json(
      { error: 'Failed to update account details' },
      { status: 500 }
    );
  }
}