import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

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

// For now, skip authentication checks to get the functionality working
// TODO: Implement proper Supabase authentication checks
async function checkAdminAccess(request: NextRequest) {
  return null; // Allow access for testing
}

function calculateMarginPrice(cost: number, marginPercent: number, flatMargin: number): number {
  if (marginPercent >= 100) marginPercent = 99;
  const marginDecimal = marginPercent / 100;
  const basePrice = cost / (1 - marginDecimal);
  return Math.max(0, basePrice + flatMargin);
}

function readCSVFile(fileName: string): any[] {
  try {
    const filePath = path.join(process.cwd(), 'src', 'app', 'csv', fileName);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parse(fileContent, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    });
  } catch (error) {
    console.error(`Error reading CSV file ${fileName}:`, error);
    return [];
  }
}

// POST - Test margin calculations against CSV data
export async function POST(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: 'Settings must be an array' },
        { status: 400 }
      );
    }

    const testResults: any = {
      timestamp: new Date().toISOString(),
      summary: {
        totalCategories: settings.length,
        activeCategories: settings.filter((s: SimplifiedMarginSetting) => s.isActive).length
      },
      categoryTests: {},
      csvDataSamples: {}
    };

    // Test each category
    for (const setting of settings) {
      if (!setting.isActive) continue;

      const categoryResult: any = {
        category: setting.category,
        csvSource: setting.csvSource,
        marginPercent: setting.marginPercent,
        flatMargin: setting.flatMargin,
        testSamples: [],
        coverage: {},
        errors: []
      };

      try {
        // Read CSV data
        const csvData = readCSVFile(setting.csvSource);
        
        if (csvData.length === 0) {
          categoryResult.errors.push(`Could not read CSV file: ${setting.csvSource}`);
          testResults.categoryTests[setting.category] = categoryResult;
          continue;
        }

        // Sample CSV data for reference
        testResults.csvDataSamples[setting.csvSource] = {
          totalRows: csvData.length,
          columns: Object.keys(csvData[0] || {}),
          firstFewRows: csvData.slice(0, 3)
        };

        // Test based on category
        let relevantData: any[] = [];

        switch (setting.category) {
          case 'BLANK_CAPS':
            // All data in Blank Cap Pricings.csv is relevant
            relevantData = csvData;
            categoryResult.coverage.totalItems = csvData.length;
            break;

          case 'CUSTOMIZATIONS':
            // Filter for non-shipping items
            relevantData = csvData.filter((row: any) => 
              row.type && row.type.toLowerCase() !== 'shipping'
            );
            categoryResult.coverage.totalItems = csvData.length;
            categoryResult.coverage.customizationItems = relevantData.length;
            break;

          case 'DELIVERY':
            // Filter for shipping items only
            relevantData = csvData.filter((row: any) => 
              row.type && row.type.toLowerCase() === 'shipping'
            );
            categoryResult.coverage.totalItems = csvData.length;
            categoryResult.coverage.deliveryItems = relevantData.length;
            break;
        }

        // Test margin calculations on sample items
        const sampleSize = Math.min(5, relevantData.length);
        for (let i = 0; i < sampleSize; i++) {
          const item = relevantData[i];
          
          // Get the base price (try different price columns)
          const priceColumns = ['price48', 'price144', 'price576', 'price1152', 'price2880', 'price10000'];
          let testPrice = 0;
          let usedColumn = '';
          
          for (const col of priceColumns) {
            if (item[col] && !isNaN(parseFloat(item[col]))) {
              testPrice = parseFloat(item[col]);
              usedColumn = col;
              break;
            }
          }

          if (testPrice > 0) {
            const customerPrice = calculateMarginPrice(testPrice, setting.marginPercent, setting.flatMargin);
            const markup = customerPrice - testPrice;
            const markupPercent = ((markup / testPrice) * 100);

            categoryResult.testSamples.push({
              itemName: item.Name || item.name || 'Unknown Item',
              itemType: item.type || 'Unknown Type',
              baseCost: testPrice,
              priceColumn: usedColumn,
              customerPrice: customerPrice,
              markup: markup,
              markupPercent: markupPercent.toFixed(2),
              marginFormula: `$${testPrice} ÷ (1 - ${setting.marginPercent}%) + $${setting.flatMargin} = $${customerPrice.toFixed(2)}`
            });
          }
        }

        categoryResult.coverage.testedSamples = categoryResult.testSamples.length;

      } catch (error: any) {
        categoryResult.errors.push(`Error processing ${setting.category}: ${error.message}`);
      }

      testResults.categoryTests[setting.category] = categoryResult;
    }

    // Calculate overall statistics
    const allSamples = Object.values(testResults.categoryTests)
      .flatMap((cat: any) => cat.testSamples || []);
    
    testResults.summary.totalSamplesTested = allSamples.length;
    testResults.summary.averageCustomerPrice = allSamples.length > 0 
      ? (allSamples.reduce((sum: number, sample: any) => sum + sample.customerPrice, 0) / allSamples.length).toFixed(2)
      : 0;

    return NextResponse.json({
      success: true,
      testResults: testResults,
      message: 'Margin calculations tested successfully against CSV data'
    });

  } catch (error: any) {
    console.error('Error testing simplified margins:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test simplified margins',
        details: error.message 
      },
      { status: 500 }
    );
  }
}