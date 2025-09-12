// Test delivery pricing tier logic

function getPriceForQuantity(pricingData, quantity) {
  if (!pricingData) return 0;
  
  console.log(`🔍 Testing quantity: ${quantity}`);
  console.log('Available prices:', pricingData);
  
  let selectedPrice = 0;
  let selectedTier = '';
  
  if (quantity >= 20000) {
    selectedPrice = pricingData.price20000 || pricingData.price10000 || 0;
    selectedTier = 'price20000';
  } else if (quantity >= 10000) {
    selectedPrice = pricingData.price10000 || 0;
    selectedTier = 'price10000';
  } else if (quantity >= 2880) {
    selectedPrice = pricingData.price2880 || 0;
    selectedTier = 'price2880';
  } else if (quantity >= 1152) {
    selectedPrice = pricingData.price1152 || 0;
    selectedTier = 'price1152';
  } else if (quantity >= 576) {
    selectedPrice = pricingData.price576 || 0;
    selectedTier = 'price576';
  } else if (quantity >= 144) {
    selectedPrice = pricingData.price144 || 0;
    selectedTier = 'price144';
  } else if (quantity >= 48) {
    selectedPrice = pricingData.price48 || 0;
    selectedTier = 'price48';
  } else {
    selectedPrice = pricingData.price48 || 0;
    selectedTier = 'price48';
  }
  
  console.log(`💰 Selected: ${selectedTier} = $${selectedPrice}`);
  return selectedPrice;
}

// Regular Delivery pricing from CSV
const regularDelivery = {
  price48: 4.29,
  price144: 3.29,
  price576: 2.71,
  price1152: 2.64,
  price2880: 2.57,
  price10000: 2.43,
  price20000: 2.43
};

console.log('=== DELIVERY PRICING TEST ===');
console.log('Expected: 1500 → $2.64, 3500 → $2.57, 12000 → $2.43');
console.log('Actual AI: 1500 → $2.71, 3500 → $2.71, 12000 → $2.71');
console.log('');

const test1500 = getPriceForQuantity(regularDelivery, 1500);
const test3500 = getPriceForQuantity(regularDelivery, 3500);
const test12000 = getPriceForQuantity(regularDelivery, 12000);

console.log('');
console.log('=== RESULTS ===');
console.log(`1500 pieces: Expected $2.64, Got $${test1500} ${test1500 === 2.64 ? '✅' : '❌'}`);
console.log(`3500 pieces: Expected $2.57, Got $${test3500} ${test3500 === 2.57 ? '✅' : '❌'}`);
console.log(`12000 pieces: Expected $2.43, Got $${test12000} ${test12000 === 2.43 ? '✅' : '❌'}`);