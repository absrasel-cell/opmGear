// Direct test of delivery pricing function
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

// Load AI Delivery pricing
async function loadAIDelivery() {
  try {
    const csvPath = path.join(process.cwd(), 'src/app/ai/Options/Delivery.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header
    
    const deliveries = dataLines.map(line => {
      const values = parseCSVLine(line);
      return {
        Name: (values[0] || '').replace(/"/g, '').trim(),
        type: (values[1] || '').replace(/"/g, '').trim(),
        DeliveryDays: (values[2] || '').replace(/"/g, '').trim(),
        price48: values[3] === 'Not Applicable' ? 0 : (parseFloat(values[3]) || 0),
        price144: values[4] === 'Not Applicable' ? 0 : (parseFloat(values[4]) || 0),
        price576: values[5] === 'Not Applicable' ? 0 : (parseFloat(values[5]) || 0),
        price1152: values[6] === 'Not Applicable' ? 0 : (parseFloat(values[6]) || 0),
        price2880: values[7] === 'Not Applicable' ? 0 : (parseFloat(values[7]) || 0),
        price10000: parseFloat(values[8]) || 0,
        price20000: parseFloat(values[9]) || 0,
        margin: parseFloat(values[10]) || 30
      };
    }).filter(item => item.Name && item.Name.length > 0);
    
    return deliveries;
  } catch (error) {
    console.error('Error loading delivery pricing:', error);
    return [];
  }
}

// Get price for quantity
function getPriceForQuantity(pricingData, quantity) {
  if (!pricingData) return 0;
  
  if (quantity >= 20000) {
    return pricingData.price20000 || pricingData.price10000 || 0;
  } else if (quantity >= 10000) {
    return pricingData.price10000 || 0;
  } else if (quantity >= 2880) {
    return pricingData.price2880 || 0;
  } else if (quantity >= 1152) {
    return pricingData.price1152 || 0;
  } else if (quantity >= 576) {
    return pricingData.price576 || 0;
  } else if (quantity >= 144) {
    return pricingData.price144 || 0;
  } else if (quantity >= 48) {
    return pricingData.price48 || 0;
  } else {
    return pricingData.price48 || 0;
  }
}

async function getAIDeliveryPrice(deliveryMethod, quantity) {
  const deliveries = await loadAIDelivery();
  const delivery = deliveries.find(item => 
    item.Name.toLowerCase().includes(deliveryMethod.toLowerCase())
  );
  
  if (!delivery) {
    console.warn(`⚠️ Delivery method not found: ${deliveryMethod}`);
    return 2.71; // Default fallback
  }
  
  const unitPrice = getPriceForQuantity(delivery, quantity);
  console.log(`🚚 ${deliveryMethod}: $${unitPrice} per unit at ${quantity} qty`);
  return unitPrice;
}

async function testDeliveryPricing() {
  console.log('🧪 TESTING AI DELIVERY PRICING...\n');
  
  const test1500 = await getAIDeliveryPrice('Regular Delivery', 1500);
  const test3500 = await getAIDeliveryPrice('Regular Delivery', 3500);
  const test12000 = await getAIDeliveryPrice('Regular Delivery', 12000);
  
  console.log('\n=== RESULTS ===');
  console.log(`1500 pieces: Got $${test1500}, Expected $2.64 ${test1500 === 2.64 ? '✅' : '❌'}`);
  console.log(`3500 pieces: Got $${test3500}, Expected $2.57 ${test3500 === 2.57 ? '✅' : '❌'}`);
  console.log(`12000 pieces: Got $${test12000}, Expected $2.43 ${test12000 === 2.43 ? '✅' : '❌'}`);
}

testDeliveryPricing().catch(console.error);