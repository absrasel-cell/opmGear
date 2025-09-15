// Debug script to test quote generation and acceptance
// Run this with: node test-quote-debug.js

const TEST_PROMPT = "i need 6-Panel Cap, Acrylic/Airmesh Fabric, Red/White, Size: 57 cm, Flat bill. Rubber Patch Front, Embroidery on Left, Embroidery on Right, Print patch on back. Closure Flexfit. B-Tape Print, Label. 500 pieces";

console.log('🧪 DEBUGGING QUOTE ACCEPTANCE ISSUE');
console.log('Test prompt:', TEST_PROMPT);
console.log('');

// This would be the flow to test:
console.log('Expected Flow:');
console.log('1. User submits prompt to support AI');
console.log('2. AI generates quote data and triggers Order Builder');
console.log('3. User clicks "Save Quote"');
console.log('4. System creates:');
console.log('   - OrderBuilderState record');
console.log('   - QuoteOrder record');
console.log('   - ConversationQuotes bridge record');
console.log('5. User clicks "Accept Quote"');
console.log('6. System should find the quote and create order');
console.log('');

console.log('🔍 Potential Issues to Check:');
console.log('');

console.log('Issue 1: Case sensitivity in table names');
console.log('- Supabase might be case-sensitive');
console.log('- Check if ConversationQuotes vs conversationquotes');
console.log('');

console.log('Issue 2: User ID mismatch');
console.log('- Save-quote might create records without userId');
console.log('- Accept-quote filters by userId');
console.log('- NULL != user.id causes no matches');
console.log('');

console.log('Issue 3: Bridge record creation timing');
console.log('- ConversationQuotes might not be created');
console.log('- Or created with wrong IDs');
console.log('');

console.log('Issue 4: hasQuote flag not set');
console.log('- Conversation.hasQuote might be false');
console.log('- Even if bridge records exist');
console.log('');

console.log('🔧 DEBUG STEPS:');
console.log('1. Check actual database state after Save Quote');
console.log('2. Verify ConversationQuotes records exist');
console.log('3. Check userId consistency');
console.log('4. Test quote-status query manually');
console.log('');

console.log('💡 LIKELY FIX NEEDED:');
console.log('- Update quote-status endpoint to handle userId NULL cases');
console.log('- Add better error logging to see exact query results');
console.log('- Ensure save-quote API sets userId correctly');