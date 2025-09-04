import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface Product {
 name: string;
 slug: string;
 itemId: string;
 priceTier: string;
 styleInfo: string;
 description: string;
 mainImage: string;
 archived: boolean;
 draft: boolean;
}

interface PricingData {
 tier: string;
 prices: {
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
 };
}

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const tier = searchParams.get('tier');
  const includeImages = searchParams.get('includeImages') === 'true';

  // Read product CSV
  const csvPath = path.join(process.cwd(), 'src/app/csv/Customer Products.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = parse(csvContent, {
   columns: true,
   skip_empty_lines: true,
   cast: (value, context) => {
    if (context.column === 'Archived' || context.column === 'Draft') {
     return value === 'TRUE';
    }
    return value;
   }
  });

  // Filter active products
  let products: Product[] = records
   .filter((record: any) => !record.Archived && !record.Draft)
   .map((record: any) => ({
    name: record.Name,
    slug: record.Slug,
    itemId: record['Item ID'],
    priceTier: record.priceTier,
    styleInfo: record.styleInfo?.replace(/<[^>]*>/g, ''), // Strip HTML
    description: record.Description?.replace(/<[^>]*>/g, ''), // Strip HTML
    mainImage: includeImages ? record['Main Image'] : null,
    archived: record.Archived,
    draft: record.Draft,
   }));

  // Apply search filter
  if (search) {
   products = products.filter(product =>
    product.name.toLowerCase().includes(search) ||
    product.description?.toLowerCase().includes(search) ||
    product.styleInfo?.toLowerCase().includes(search)
   );
  }

  // Get pricing data if tier specified
  let pricingData: PricingData[] = [];
  if (tier || !tier) { // Always load pricing for AI context
   const pricingPath = path.join(process.cwd(), 'src/app/csv/Blank Cap Pricings.csv');
   const pricingContent = fs.readFileSync(pricingPath, 'utf-8');
   
   const pricingRecords = parse(pricingContent, {
    columns: true,
    skip_empty_lines: true,
    cast: (value, context) => {
     if (context.column?.startsWith('price')) {
      return parseFloat(value) || 0;
     }
     return value;
    }
   });

   pricingData = pricingRecords.map((record: any) => ({
    tier: record.Name,
    prices: {
     price48: record.price48,
     price144: record.price144,
     price576: record.price576,
     price1152: record.price1152,
     price2880: record.price2880,
     price10000: record.price10000,
    }
   }));
  }

  return NextResponse.json({
   products,
   pricing: pricingData,
   total: products.length,
   message: `Found ${products.length} available products`
  });

 } catch (error) {
  console.error('Internal API Error - Available Products:', error);
  return NextResponse.json(
   { error: 'Failed to load products' },
   { status: 500 }
  );
 }
}