import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SimplifiedMarginSetting {
  id: string;
  category: 'BLANK_CAPS' | 'CUSTOMIZATIONS' | 'DELIVERY';
  marginPercent: number;
  flatMargin: number;
  isActive: boolean;
  csvSource: string;
  description: string;
  exampleItems: string[];
}

// Default settings to initialize with if none exist in database
const defaultSettings: Omit<SimplifiedMarginSetting, 'id'>[] = [
  {
    category: 'BLANK_CAPS',
    marginPercent: 60,
    flatMargin: 0.00,
    isActive: true,
    csvSource: 'Blank Cap Pricings.csv',
    description: 'All cap tier pricing (Tier 1, 2, 3)',
    exampleItems: ['Tier 1 Cap ($1.80)', 'Tier 2 Cap ($2.20)', 'Tier 3 Cap ($2.40)']
  },
  {
    category: 'CUSTOMIZATIONS',
    marginPercent: 65,
    flatMargin: 0.10,
    isActive: true,
    csvSource: 'Customization Pricings.csv',
    description: 'Logo types, Accessories, Premium Closures, Fabrics, Applications',
    exampleItems: ['3D Embroidery ($0.20)', 'Large Rubber Patch ($1.50)', 'Hang Tags ($0.50)', 'Metal Eyelets ($0.25)']
  },
  {
    category: 'DELIVERY',
    marginPercent: 50,
    flatMargin: 0.25,
    isActive: true,
    csvSource: 'Customization Pricings.csv',
    description: 'All shipping and delivery options',
    exampleItems: ['Regular Delivery ($3.00)', 'Priority Delivery ($3.20)', 'Air Freight ($1.20)', 'Sea Freight ($0.40)']
  }
];

// For now, skip authentication checks to get the functionality working
// TODO: Implement proper Supabase authentication checks
async function checkAdminAccess(request: NextRequest) {
  return null; // Allow access for testing
}

// GET - Load simplified margin settings
export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    console.log('📡 Loading simplified margin settings from database...');

    // Load settings from database
    const dbSettings = await prisma.simplifiedMarginSetting.findMany({
      orderBy: { category: 'asc' }
    });

    console.log('📡 Found', dbSettings.length, 'settings in database');

    // If no settings exist, create default ones
    if (dbSettings.length === 0) {
      console.log('📡 No settings found, creating defaults...');
      const createdSettings = await Promise.all(
        defaultSettings.map(setting => 
          prisma.simplifiedMarginSetting.create({
            data: {
              category: setting.category,
              marginPercent: setting.marginPercent,
              flatMargin: setting.flatMargin,
              isActive: setting.isActive,
              csvSourceInfo: JSON.stringify({
                csvSource: setting.csvSource,
                description: setting.description
              }),
              exampleItems: setting.exampleItems
            }
          })
        )
      );
      
      console.log('📡 Created', createdSettings.length, 'default settings');
      
      // Transform created settings to match interface
      const transformedSettings: SimplifiedMarginSetting[] = createdSettings.map(setting => ({
        id: setting.id,
        category: setting.category as 'BLANK_CAPS' | 'CUSTOMIZATIONS' | 'DELIVERY',
        marginPercent: Number(setting.marginPercent),
        flatMargin: Number(setting.flatMargin),
        isActive: setting.isActive,
        csvSource: JSON.parse(setting.csvSourceInfo).csvSource,
        description: JSON.parse(setting.csvSourceInfo).description,
        exampleItems: setting.exampleItems
      }));

      return NextResponse.json({
        success: true,
        data: transformedSettings
      });
    }

    // Transform database settings to match interface
    const transformedSettings: SimplifiedMarginSetting[] = dbSettings.map(setting => {
      const csvInfo = JSON.parse(setting.csvSourceInfo);
      return {
        id: setting.id,
        category: setting.category as 'BLANK_CAPS' | 'CUSTOMIZATIONS' | 'DELIVERY',
        marginPercent: Number(setting.marginPercent),
        flatMargin: Number(setting.flatMargin),
        isActive: setting.isActive,
        csvSource: csvInfo.csvSource,
        description: csvInfo.description,
        exampleItems: setting.exampleItems
      };
    });

    console.log('📡 Returning', transformedSettings.length, 'simplified margin settings');

    return NextResponse.json({
      success: true,
      data: transformedSettings
    });

  } catch (error: any) {
    console.error('Error loading simplified margin settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load simplified margin settings',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Save simplified margin settings
export async function POST(request: NextRequest) {
  try {
    console.log('📡 Simplified Margins API: POST request received');
    
    const authError = await checkAdminAccess(request);
    if (authError) {
      console.log('❌ Auth check failed');
      return authError;
    }

    const body = await request.json();
    console.log('📡 Request body received:', body);
    const { settings } = body;
    console.log('📡 Settings to save:', settings);

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: 'Settings must be an array' },
        { status: 400 }
      );
    }

    // Validate each setting
    for (const setting of settings) {
      if (!setting.id || !setting.category || 
          typeof setting.marginPercent !== 'number' || 
          typeof setting.flatMargin !== 'number' ||
          typeof setting.isActive !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'Invalid setting format' },
          { status: 400 }
        );
      }

      // Validate margin percentage
      if (setting.marginPercent < 0 || setting.marginPercent >= 100) {
        return NextResponse.json(
          { success: false, error: 'Margin percentage must be between 0 and 99' },
          { status: 400 }
        );
      }

      // Validate flat margin
      if (setting.flatMargin < 0) {
        return NextResponse.json(
          { success: false, error: 'Flat margin cannot be negative' },
          { status: 400 }
        );
      }
    }

    console.log('📡 Saving settings to database...');

    // Save each setting to database using upsert
    const savedSettings = await Promise.all(
      settings.map(async (setting: SimplifiedMarginSetting) => {
        const csvSourceInfo = JSON.stringify({
          csvSource: setting.csvSource || (setting.category === 'BLANK_CAPS' 
            ? 'Blank Cap Pricings.csv' 
            : 'Customization Pricings.csv'),
          description: setting.description || `${setting.category} pricing`
        });

        console.log(`📡 Saving ${setting.category} with marginPercent: ${setting.marginPercent}, flatMargin: ${setting.flatMargin}`);

        const savedSetting = await prisma.simplifiedMarginSetting.upsert({
          where: { 
            id: setting.id
          },
          update: {
            marginPercent: setting.marginPercent,
            flatMargin: setting.flatMargin,
            isActive: setting.isActive,
            csvSourceInfo: csvSourceInfo,
            exampleItems: setting.exampleItems || []
          },
          create: {
            id: setting.id,
            category: setting.category,
            marginPercent: setting.marginPercent,
            flatMargin: setting.flatMargin,
            isActive: setting.isActive,
            csvSourceInfo: csvSourceInfo,
            exampleItems: setting.exampleItems || []
          }
        });

        console.log(`✅ Saved ${setting.category}: marginPercent=${savedSetting.marginPercent}, flatMargin=${savedSetting.flatMargin}`);

        // Transform back to interface format
        const csvInfo = JSON.parse(savedSetting.csvSourceInfo);
        return {
          id: savedSetting.id,
          category: savedSetting.category as 'BLANK_CAPS' | 'CUSTOMIZATIONS' | 'DELIVERY',
          marginPercent: Number(savedSetting.marginPercent),
          flatMargin: Number(savedSetting.flatMargin),
          isActive: savedSetting.isActive,
          csvSource: csvInfo.csvSource,
          description: csvInfo.description,
          exampleItems: savedSetting.exampleItems
        };
      })
    );

    console.log('✅ All settings saved successfully to database:', savedSettings);

    return NextResponse.json({
      success: true,
      data: savedSettings,
      message: 'Simplified margin settings saved successfully'
    });

  } catch (error: any) {
    console.error('❌ Error saving simplified margin settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save simplified margin settings',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH - Update specific setting
export async function PATCH(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json(
        { success: false, error: 'ID and updates are required' },
        { status: 400 }
      );
    }

    console.log(`📡 Updating setting ${id} with:`, updates);

    // Find the setting in database
    const existingSetting = await prisma.simplifiedMarginSetting.findUnique({
      where: { id }
    });

    if (!existingSetting) {
      return NextResponse.json(
        { success: false, error: 'Setting not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (updates.marginPercent !== undefined) updateData.marginPercent = updates.marginPercent;
    if (updates.flatMargin !== undefined) updateData.flatMargin = updates.flatMargin;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    // Handle csvSource info updates
    if (updates.csvSource || updates.description) {
      const existingCsvInfo = JSON.parse(existingSetting.csvSourceInfo);
      const newCsvInfo = {
        csvSource: updates.csvSource || existingCsvInfo.csvSource,
        description: updates.description || existingCsvInfo.description
      };
      updateData.csvSourceInfo = JSON.stringify(newCsvInfo);
    }

    // Handle example items separately
    if (updates.exampleItems !== undefined) {
      updateData.exampleItems = updates.exampleItems;
    }

    // Update in database
    const updatedSetting = await prisma.simplifiedMarginSetting.update({
      where: { id },
      data: updateData
    });

    console.log(`✅ Updated ${id}:`, updatedSetting);

    // Load all settings to return
    const allSettings = await prisma.simplifiedMarginSetting.findMany({
      orderBy: { category: 'asc' }
    });

    // Transform to interface format
    const transformedSettings: SimplifiedMarginSetting[] = allSettings.map(setting => {
      const csvInfo = JSON.parse(setting.csvSourceInfo);
      return {
        id: setting.id,
        category: setting.category as 'BLANK_CAPS' | 'CUSTOMIZATIONS' | 'DELIVERY',
        marginPercent: Number(setting.marginPercent),
        flatMargin: Number(setting.flatMargin),
        isActive: setting.isActive,
        csvSource: csvInfo.csvSource,
        description: csvInfo.description,
        exampleItems: setting.exampleItems
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedSettings,
      message: 'Setting updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating simplified margin setting:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update simplified margin setting',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}