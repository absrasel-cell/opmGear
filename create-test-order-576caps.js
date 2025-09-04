/**
 * Simple test to create an order with 576 caps via Order AI
 * This should trigger the same email notification as "Save Order"
 */

// Test data matching the user's request
const orderPrompt = `I need 576 pcs of 6 panel, flat bill, Flexfit, High profile, size: 59 cm, color: Brown. One Logo will be on Front another on back. Fabric needs to be Acrylic. Additionally, I want Sticker, Hang Tag in my order.`;

console.log('=== ORDER AI TEST FOR 576 CAPS ===');
console.log('Prompt:', orderPrompt);
console.log('');
console.log('To test this order:');
console.log('1. Navigate to http://localhost:3010/order');
console.log('2. Use this exact prompt in the AI chat:');
console.log('   "' + orderPrompt + '"');
console.log('3. When it provides a quote, respond with: "yes, create my order"');
console.log('4. The system will create a real order and send email notification via N8N');
console.log('');
console.log('Expected behavior:');
console.log('- Order AI will calculate costs for 576 caps');
console.log('- It will include 6-panel, flat bill, Flexfit closure');
console.log('- Brown color with High profile');
console.log('- Front and back logo setup costs');
console.log('- Acrylic fabric option');
console.log('- Sticker and Hang Tag accessories');
console.log('- Real order will be created in database');
console.log('- N8N webhook will send email notification');
console.log('');

// Show expected order structure
const expectedOrder = {
  quantity: 576,
  product: '6 Panel Baseball Cap',
  specifications: {
    panels: '6 panel',
    billStyle: 'Flat bill',
    closure: 'Flexfit',
    profile: 'High profile', 
    size: '59 cm',
    color: 'Brown',
    fabric: 'Acrylic'
  },
  logos: {
    front: 'Logo 1',
    back: 'Logo 2'
  },
  accessories: ['Sticker', 'Hang Tag'],
  estimatedCost: 'Will be calculated based on tier pricing + logo setup + accessories'
};

console.log('Expected Order Structure:');
console.log(JSON.stringify(expectedOrder, null, 2));