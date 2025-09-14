// Debug script to test regex parsing issue with exact user message
console.log('=== DEBUGGING REGEX PARSING ISSUE ===\n');

const message = "i need 7-Panel Cap, Polyester/Laser Cut Fabric, Black/Grey, Size: 59 cm, Slight Curved. Leather Patch Front, 3D Embroidery on Left, Flat Embroidery on Right, Rubber patch on back. Closure Fitted. Hang Tag, Sticker. 600 pcs";

// Test the regex patterns in sequence exactly as they appear in the parseOrderRequirements function
const BUSINESS_RULES_DEFAULTS_quantity = 144;
let quantity = BUSINESS_RULES_DEFAULTS_quantity;

console.log('🎯 Message:', message);
console.log('📏 Message length:', message.length);
console.log('🔢 Starting with default quantity:', quantity);
console.log('');

// 1. Test total pattern
console.log('1️⃣ Testing TOTAL pattern: /(\d+,?\d*)\s*(?:caps?\s*)?total/i');
const totalMatch = message.match(/(\d+,?\d*)\s*(?:caps?\s*)?total/i);
console.log('   Result:', totalMatch);

if (totalMatch) {
    const totalStr = totalMatch[1].replace(/,/g, '');
    quantity = parseInt(totalStr);
    console.log('   ✅ Total quantity detected:', quantity);
} else {
    console.log('   ❌ No total match found, trying direct quantity pattern...');

    // 2. Test direct quantity pattern
    console.log('2️⃣ Testing DIRECT QUANTITY pattern: /(\d+,?\d*)\s*(?:pcs?|caps?|pieces?|units?)/i');
    const directQuantityMatch = message.match(/(\d+,?\d*)\s*(?:pcs?|caps?|pieces?|units?)/i);
    console.log('   Result:', directQuantityMatch);

    if (directQuantityMatch) {
        const quantityStr = directQuantityMatch[1].replace(/,/g, '');
        quantity = parseInt(quantityStr);
        console.log('   ✅ Direct quantity detected:', quantity);
    } else {
        console.log('   ❌ No direct quantity match found, trying loose pattern...');

        // 3. Test loose quantity pattern
        console.log('3️⃣ Testing LOOSE pattern: /(\d+,?\d*)\s+(?:blank\s+)?caps?/i');
        const looseQuantityMatch = message.match(/(\d+,?\d*)\s+(?:blank\s+)?caps?/i);
        console.log('   Result:', looseQuantityMatch);

        if (looseQuantityMatch) {
            const quantityStr = looseQuantityMatch[1].replace(/,/g, '');
            quantity = parseInt(quantityStr);
            console.log('   ✅ Loose quantity detected:', quantity);
        } else {
            console.log('   ❌ No loose quantity match found, trying standalone...');

            // 4. Test standalone pattern
            console.log('4️⃣ Testing STANDALONE pattern: /(?:for|is)\s+(\d+,?\d*)[\s\?]*$/i');
            const standaloneNumberMatch = message.match(/(?:for|is)\s+(\d+,?\d*)[\s\?]*$/i);
            console.log('   Result:', standaloneNumberMatch);

            if (standaloneNumberMatch) {
                const quantityStr = standaloneNumberMatch[1].replace(/,/g, '');
                quantity = parseInt(quantityStr);
                console.log('   ✅ Standalone number detected:', quantity);
            } else {
                console.log('   ❌ No standalone match found, checking multi-color...');

                // 5. Check multi-color only if quantity is still default
                if (quantity === BUSINESS_RULES_DEFAULTS_quantity) {
                    console.log('5️⃣ Testing MULTI-COLOR detection...');
                    const multiColorMatches = message.match(/\b(\d+)\b/g);
                    console.log('   All numbers found:', multiColorMatches);

                    if (multiColorMatches && multiColorMatches.length > 1) {
                        const hasColors = /(?:black|white|red|blue|navy|green|yellow|orange|purple|pink|brown|gray|grey)/i.test(message);
                        const hasMultipleNumbers = multiColorMatches.length >= 2;

                        console.log('   Has colors:', hasColors);
                        console.log('   Has multiple numbers:', hasMultipleNumbers);

                        if (hasColors && hasMultipleNumbers) {
                            let totalQuantity = 0;
                            multiColorMatches.forEach(match => {
                                const num = parseInt(match);
                                console.log(`   Checking number: ${num} (valid range 10-10000: ${num >= 10 && num <= 10000})`);
                                if (num >= 10 && num <= 10000) {
                                    totalQuantity += num;
                                }
                            });

                            if (totalQuantity > 0) {
                                quantity = totalQuantity;
                                console.log('   ✅ Multi-color quantity detected:', quantity);
                            }
                        }
                    }
                }
            }
        }
    }
}

console.log('\n🎯 FINAL RESULT:');
console.log('   Final quantity:', quantity);
console.log('   Expected: 600');
console.log('   Match:', quantity === 600 ? '✅ SUCCESS' : '❌ FAILED');

// Additional debug: Let's also test some variations
console.log('\n🔬 TESTING VARIATIONS:');
const testCases = [
    'i need 600 pcs',
    'need 600 pieces',
    'want 600 caps',
    'order 600 units',
    '600 pcs total'
];

testCases.forEach(test => {
    const match = test.match(/(\d+,?\d*)\s*(?:pcs?|caps?|pieces?|units?)/i);
    console.log(`   "${test}" -> ${match ? match[1] : 'NO MATCH'}`);
});