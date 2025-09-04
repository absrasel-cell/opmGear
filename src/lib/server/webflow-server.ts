/**
 * SERVER-ONLY WEBFLOW UTILITIES
 * 
 * This file contains server-side only functions that use Node.js APIs
 * like filesystem operations. These should only be called from API routes
 * or server components.
 */

import { promises as fs } from 'fs';
import path from 'path';

// Helper function to parse CSV lines with quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Server-only function to load blank cap pricing data from CSV
export async function loadBlankCapPricingServer(): Promise<any[]> {
  try {
    // Load pricing data from CSV file
    const csvPath = path.join(process.cwd(), 'src/app/csv/Blank Cap Pricings.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim()); // Remove empty lines
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      // Parse CSV line, handling quoted values
      const values = parseCSVLine(line);
      
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        price48: parseFloat(values[1]) || 0,
        price144: parseFloat(values[2]) || 0,
        price576: parseFloat(values[3]) || 0,
        price1152: parseFloat(values[4]) || 0,
        price2880: parseFloat(values[5]) || 0,
        price10000: parseFloat(values[6]) || 0,
      };
    }).filter(item => item.Name && item.Name.length > 0); // Filter out empty rows
  } catch (error) {
    console.error('Error loading blank cap pricing from CSV:', error);
    return [];
  }
}

// Server-only function to load customization pricing
export async function loadCustomizationPricingServer(): Promise<any[]> {
  try {
    const csvPath = path.join(process.cwd(), 'src/app/csv/Customization Pricings.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    return dataLines.map(line => {
      const values = parseCSVLine(line);
      
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        type: (values[1] || '').trim(),
        price48: parseFloat(values[2]) || 0,
        price144: parseFloat(values[3]) || 0,
        price576: parseFloat(values[4]) || 0,
        price1152: parseFloat(values[5]) || 0,
        price2880: parseFloat(values[6]) || 0,
        price10000: parseFloat(values[7]) || 0,
      };
    }).filter(item => item.Name && item.Name.length > 0);
  } catch (error) {
    console.error('Error loading customization pricing from CSV:', error);
    return [];
  }
}

// Server-only function to load customer products data from CSV
export async function loadCustomerProductsServer(): Promise<any[]> {
  try {
    // Load customer products data from CSV file
    const csvPath = path.join(process.cwd(), 'src/app/csv/Customer Products.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim()); // Remove empty lines
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      // Parse CSV line, handling quoted values
      const values = parseCSVLine(line);
      
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        Profile: (values[1] || '').replace(/"/g, '').trim(),
        BillOrVisorShape: (values[2] || '').replace(/"/g, '').trim(),
        PanelCount: (values[3] || '').replace(/"/g, '').trim(),
        PriceTier: (values[4] || '').replace(/"/g, '').trim(),
        StructureType: (values[5] || '').replace(/"/g, '').trim(),
        NickNames: (values[6] || '').replace(/"/g, '').trim(),
      };
    }).filter(item => item.Name && item.Name.length > 0); // Filter out empty rows
  } catch (error) {
    console.error('Error loading customer products from CSV:', error);
    return [];
  }
}