// Test CapCraft AI with user's exact prompt
const testMessage = "i need 7-Panel Cap, Polyester/Laser Cut Fabric, Black/Grey, Size: 59 cm, Slight Curved. Leather Patch Front, 3D Embroidery on Left, Flat Embroidery on Right, Rubber patch on back. Closure Fitted. Hang Tag, Sticker. 600 pcs";

console.log('🧪 Testing CapCraft AI parsing with message:');
console.log(testMessage);

async function testCapCraftAI() {
  try {
    const response = await fetch('http://localhost:3000/api/support/step-by-step-pricing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        intent: 'ORDER_CREATION',
        conversationHistory: [],
        userProfile: {
          id: 'test-user',
          name: 'Test User',
          email: 'test@test.com'
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ CapCraft AI Response:');
      console.log('📊 Message:', result.message.substring(0, 200) + '...');
      console.log('🤖 Assistant:', result.assistant?.name);
      console.log('🔧 Quote Data Available:', !!result.quoteData);

      if (result.quoteData) {
        console.log('📋 Raw Quote Data Structure:', Object.keys(result.quoteData));
        console.log('📋 Parsed Requirements:');
        console.log('   Quantity:', result.quoteData.quantity);
        console.log('   Colors:', result.quoteData.colors || result.quoteData.color);
        console.log('   Fabric:', result.quoteData.fabric);
        console.log('   Size:', result.quoteData.size);
        console.log('   Panel Count:', result.quoteData.panelCount);
        console.log('   Closure:', result.quoteData.closure);
        console.log('   Logos:', result.quoteData.logoRequirements?.map(l => `${l.location}: ${l.type}`).join(', '));
        console.log('   Accessories:', result.quoteData.accessoriesRequirements?.map(a => a.type).join(', '));
        console.log('📊 Full Quote Data:', JSON.stringify(result.quoteData, null, 2));
      } else {
        console.log('❌ No quote data found in response');
        console.log('📊 Full Response Keys:', Object.keys(result));
      }
    } else {
      console.error('❌ API Error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testCapCraftAI();