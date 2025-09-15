// Test to reproduce the exact Snapback misinterpretation issue
async function testSnapbackIssue() {
    const baseUrl = 'http://localhost:3000';

    console.log('🔍 Testing Snapback Misinterpretation Issue...\n');

    try {
        // Step 1: Generate initial quote (exact same as in error report)
        console.log('📝 Step 1: Generate initial quote');
        const initialQuote = await fetch(`${baseUrl}/api/support-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'create me a quote for 800 piece, Acrylic/Airmesh fabric, Royal/Black, size: 59 cm. which has Rubber patch Medium Size on the front. Fitted Cap.',
                conversationHistory: []
            })
        });

        const initialResponse = await initialQuote.json();
        console.log('✅ Initial quote generated');

        // Extract initial values
        const initialOrderBuilder = initialResponse.orderBuilder;
        const initialMessage = initialResponse.message || initialResponse.response;

        console.log('\n📊 INITIAL STATE:');
        console.log(`   Color: ${initialOrderBuilder?.capStyle?.data?.color}`);
        console.log(`   Closure: ${initialOrderBuilder?.customization?.premiumUpgrades?.closure}`);
        console.log(`   Logos: ${initialOrderBuilder?.customization?.logoSetup?.length || 0}`);
        console.log(`   Logo Details: ${JSON.stringify(initialOrderBuilder?.customization?.logoSetup?.[0])}`);
        console.log(`   Total Cost: $${initialOrderBuilder?.costBreakdown?.totalCost}`);

        // Step 2: Test "change to Snapback" (exact same as in error report)
        console.log('\n📝 Step 2: Test "change to Snapback"');
        const conversationHistory = [
            {
                role: 'user',
                content: 'create me a quote for 800 piece, Acrylic/Airmesh fabric, Royal/Black, size: 59 cm. which has Rubber patch Medium Size on the front. Fitted Cap.'
            },
            {
                role: 'assistant',
                content: initialMessage
            }
        ];

        const followUpQuote = await fetch(`${baseUrl}/api/support-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'change to Snapback',
                conversationHistory: conversationHistory
            })
        });

        const followUpResponse = await followUpQuote.json();
        const followUpOrderBuilder = followUpResponse.orderBuilder;
        const followUpMessage = followUpResponse.message || followUpResponse.response;

        console.log('\n📊 FOLLOW-UP STATE:');
        console.log(`   Color: ${followUpOrderBuilder?.capStyle?.data?.color}`);
        console.log(`   Closure: ${followUpOrderBuilder?.customization?.premiumUpgrades?.closure}`);
        console.log(`   Logos: ${followUpOrderBuilder?.customization?.logoSetup?.length || 0}`);
        console.log(`   Logo Details: ${JSON.stringify(followUpOrderBuilder?.customization?.logoSetup?.[0])}`);
        console.log(`   Total Cost: $${followUpOrderBuilder?.costBreakdown?.totalCost}`);

        // Analysis
        console.log('\n🔍 ISSUE ANALYSIS:');

        // Check if Snapback was interpreted as color (WRONG)
        const snapbackAsColor = followUpOrderBuilder?.capStyle?.data?.color === 'Snapback';
        console.log(`   1. Snapback interpreted as COLOR: ${snapbackAsColor ? '❌ YES (WRONG)' : '✅ NO (CORRECT)'}`);

        // Check if closure was changed to Snapback (CORRECT)
        const snapbackAsClosure = followUpOrderBuilder?.customization?.premiumUpgrades?.closure === 'Snapback';
        console.log(`   2. Snapback interpreted as CLOSURE: ${snapbackAsClosure ? '✅ YES (CORRECT)' : '❌ NO (WRONG)'}`);

        // Check logo preservation
        const initialLogos = initialOrderBuilder?.customization?.logoSetup?.length || 0;
        const followUpLogos = followUpOrderBuilder?.customization?.logoSetup?.length || 0;
        const logosPreserved = initialLogos === followUpLogos && initialLogos > 0;
        console.log(`   3. Logo preservation: ${logosPreserved ? '✅ PRESERVED' : '❌ LOST'} (${initialLogos} → ${followUpLogos})`);

        // Check mold charge preservation
        const initialMoldCharge = initialOrderBuilder?.customization?.logoSetup?.[0]?.moldCharge || 0;
        const followUpMoldCharge = followUpOrderBuilder?.customization?.logoSetup?.[0]?.moldCharge || 0;
        const moldChargePreserved = initialMoldCharge === followUpMoldCharge && initialMoldCharge > 0;
        console.log(`   4. Mold charge preservation: ${moldChargePreserved ? '✅ PRESERVED' : '❌ LOST'} ($${initialMoldCharge} → $${followUpMoldCharge})`);

        // Overall assessment
        const hasIssues = snapbackAsColor || !snapbackAsClosure || !logosPreserved || !moldChargePreserved;
        console.log(`\n🏆 OVERALL RESULT: ${hasIssues ? '❌ ISSUES IDENTIFIED' : '✅ ALL CORRECT'}`);

        if (hasIssues) {
            console.log('\n🔧 IDENTIFIED ISSUES:');
            if (snapbackAsColor) console.log('   - Snapback incorrectly interpreted as color instead of closure');
            if (!snapbackAsClosure) console.log('   - Snapback not properly applied as closure');
            if (!logosPreserved) console.log('   - Complete logo customization lost');
            if (!moldChargePreserved) console.log('   - Mold charge data lost');
        }

        // Check AI message content
        console.log('\n📝 AI MESSAGE ANALYSIS:');
        console.log('Follow-up message contains:');
        console.log(`   - "Color: Snapback": ${followUpMessage.includes('Color: Snapback') ? '❌ YES (WRONG)' : '✅ NO'}`);
        console.log(`   - "Closure: Snapback": ${followUpMessage.includes('Closure: Snapback') ? '✅ YES (CORRECT)' : '❌ NO'}`);
        console.log(`   - Logo information: ${followUpMessage.includes('Logo Setup') && !followUpMessage.includes('Logo Setup: None') ? '✅ YES' : '❌ NO/MISSING'}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSnapbackIssue();