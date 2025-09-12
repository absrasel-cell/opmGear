// Debug script to test the actual pricing functions
const path = require('path');
const fs = require('fs').promises;

// Simple CSV parser
function parseCSVLine(line) {
  const result = [];
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

// Load blank cap pricing
async function loadBlankCapPricing() {
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Blank Cap/priceTier.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    const pricingMap = {};
    dataLines.forEach(line => {
      const values = parseCSVLine(line);
      const tierName = (values[0] || '').replace(/"/g, '').trim();
      if (tierName) {
        pricingMap[tierName] = {
          price48: parseFloat(values[1]) || 0,
          price144: parseFloat(values[2]) || 0,
          price576: parseFloat(values[3]) || 0,
          price1152: parseFloat(values[4]) || 0,
          price2880: parseFloat(values[5]) || 0,
          price10000: parseFloat(values[6]) || 0
        };
      }
    });
    
    return pricingMap;
  } catch (error) {
    console.error('Error loading pricing:', error);
    return {};
  }
}

// Get price for quantity
function getPriceForQuantity(pricingData, quantity) {
  if (!pricingData) return 0;
  
  console.log('🔍 Available pricing data:', pricingData);
  
  if (quantity >= 10000) {
    return pricingData.price10000 || 0;
  } else if (quantity >= 2880) {
    return pricingData.price2880 || 0;
  } else if (quantity >= 1152) {
    return pricingData.price1152 || 0;
  } else if (quantity >= 576) {
    return pricingData.price576 || 0;
  } else if (quantity >= 144) {
    return pricingData.price144 || 0;  // 144 should return $3.75!
  } else if (quantity >= 48) {
    return pricingData.price48 || 0;
  } else {
    return pricingData.price48 || 0;
  }
}

async function testPricing() {
  console.log('🧪 TESTING BLANK CAP PRICING...\n');
  
  const pricing = await loadBlankCapPricing();
  console.log('📊 Loaded pricing tiers:', Object.keys(pricing));
  
  // Test Tier 1 with 144 quantity (the failing case)
  const tier1Data = pricing['Tier 1'];
  if (!tier1Data) {
    console.error('❌ Tier 1 not found in pricing data!');
    return;
  }
  
  console.log('\n🎯 Testing Tier 1, 144 quantity:');
  console.log('Tier 1 data:', tier1Data);
  
  const price = getPriceForQuantity(tier1Data, 144);
  console.log(`💰 Result: $${price} per cap`);
  console.log(`📦 Total for 144 caps: $${price * 144}`);
  
  if (price === 3.75) {
    console.log('✅ CORRECT! Should be $3.75');
  } else {
    console.log('❌ WRONG! Should be $3.75 but got $' + price);
  }
}

testPricing().catch(console.error);