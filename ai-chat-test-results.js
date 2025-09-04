// Critical AI Chat Performance Test Suite
// Testing against knowledge base requirements from SUPPORT_AI_DOCUMENTATION.md

const testCases = [
    // Test Case 1: Quantity Detection Issue (from currentTask.txt)
    {
        id: "T001",
        category: "Quantity Detection",
        description: "Test exact quantity matching - customer says 150 pieces",
        input: "I have an event where I have already developed my tshirt in White/Red/Blue. Now i need Cap 150 pieces. what would you suggest ?",
        expectedBehavior: "Should recommend setup for exactly 150 pieces, not 500",
        criticalFailure: "AI responded with 500 pieces instead of requested 150"
    },

    // Test Case 2: Budget + Maximum Quantity (Core functionality)
    {
        id: "T002", 
        category: "Budget Optimization",
        description: "Test budget constraint with maximum quantity request",
        input: "I have $1000 budget and need as many caps as possible with 3D logo on front",
        expectedBehavior: "Should calculate ~237 caps max for $1000, show 3D embroidery pricing, stay within budget"
    },

    // Test Case 3: Budget + Specific Needs
    {
        id: "T003",
        category: "Budget + Specific Requirements", 
        description: "Test budget with specific logo requirements",
        input: "I have $500 budget, need white caps with small logo embroidered on front, lowest cost",
        expectedBehavior: "Should trigger generateBudgetFocusedResponse(), optimize quantity for $500 budget"
    },

    // Test Case 4: Context Retention on 'No' Response
    {
        id: "T004",
        category: "Context Retention",
        description: "Test follow-up response handling after quote",
        input: "no", // This should be sent after a quote is provided
        expectedBehavior: "Should finalize order, not give generic response. Must maintain context."
    },

    // Test Case 5: 3D Logo Priority Detection
    {
        id: "T005",
        category: "Logo Type Detection",
        description: "Test 3D logo detection and pricing",
        input: "What's the maximum caps I can get for $1000 with 3D logo?",
        expectedBehavior: "Should detect 3D logo, apply 3D embroidery pricing ($1.50-2.00 per cap), calculate ~237 caps"
    },

    // Test Case 6: Simple Budget Query
    {
        id: "T006",
        category: "Basic Budget Detection",
        description: "Test simple budget query handling",
        input: "I need caps for $300 budget",
        expectedBehavior: "Should detect budget, calculate maximum quantity, provide cost breakdown"
    },

    // Test Case 7: Order Progression - Finalization
    {
        id: "T007",
        category: "Order Progression",
        description: "Test order finalization trigger",
        input: "finalize my order",
        expectedBehavior: "Should trigger generateOrderProgressionResponse(), show order summary, next steps"
    },

    // Test Case 8: Accessories Selection
    {
        id: "T008",
        category: "Optional Items Selection",
        description: "Test accessories and priority delivery selection",
        input: "yes accessories and priority delivery",
        expectedBehavior: "Should add accessories (+$0.75/cap) and priority delivery (+$1.50/cap), recalculate total"
    },

    // Test Case 9: Multiple Options Overwhelm Test
    {
        id: "T009",
        category: "Option Overload Prevention",
        description: "Test that AI doesn't overwhelm with 85+ cap options",
        input: "I need custom caps for my business",
        expectedBehavior: "Should ask specific questions instead of listing all 85+ cap options"
    },

    // Test Case 10: Format Quality Test
    {
        id: "T010",
        category: "Response Formatting",
        description: "Test for escaped characters and proper formatting",
        input: "Give me a quote for 100 caps with logo",
        expectedBehavior: "Should have proper line breaks, no \\n escaped characters, professional formatting"
    }
];

// Test execution function
async function runAIChatTest(testCase) {
    try {
        const response = await fetch('http://localhost:3005/api/ai-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: testCase.input,
                conversationHistory: []
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        return {
            testId: testCase.id,
            category: testCase.category,
            input: testCase.input,
            response: data.response || data.message,
            status: 'SUCCESS',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            testId: testCase.id,
            category: testCase.category,
            input: testCase.input,
            error: error.message,
            status: 'ERROR',
            timestamp: new Date().toISOString()
        };
    }
}

// Execute all tests
async function runAllTests() {
    console.log('🤖 Starting AI Chat Performance Test Suite...\n');
    
    const results = [];
    
    for (const testCase of testCases) {
        console.log(`Testing ${testCase.id}: ${testCase.description}`);
        const result = await runAIChatTest(testCase);
        results.push(result);
        console.log(`✅ ${testCase.id} completed\n`);
        
        // Wait between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
}

// Run the tests if called directly
if (require.main === module) {
    runAllTests().then(results => {
        console.log('📊 TEST RESULTS SUMMARY:');
        console.log('========================\n');
        
        results.forEach(result => {
            console.log(`${result.testId} (${result.category}): ${result.status}`);
            if (result.status === 'SUCCESS') {
                console.log(`Input: "${result.input}"`);
                console.log(`Response: "${result.response.substring(0, 200)}..."`);
            } else {
                console.log(`Error: ${result.error}`);
            }
            console.log('---\n');
        });
        
        const successCount = results.filter(r => r.status === 'SUCCESS').length;
        console.log(`✅ Successful tests: ${successCount}/${results.length}`);
        console.log(`❌ Failed tests: ${results.length - successCount}/${results.length}`);
    }).catch(console.error);
}

module.exports = { testCases, runAIChatTest, runAllTests };