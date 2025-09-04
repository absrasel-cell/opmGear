#!/usr/bin/env node

/**
 * ORDER AI STRESS TEST - Human-like Multi-Step Conversation
 * Tests memory retention, conversation flow, and order finalization
 * 
 * This script simulates a realistic customer conversation with:
 * - Complex requirements spread across multiple messages
 * - Human-like language patterns and corrections
 * - Memory testing across 10+ conversation steps
 * - Final order creation and verification
 */

const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = 'http://localhost:3000';
const TEST_EMAIL = 'stress-test@uscustomcap.com';
const DELAY_BETWEEN_MESSAGES = 2000; // 2 seconds between messages

// Test conversation flow - realistic human interaction
const CONVERSATION_STEPS = [
    {
        step: 1,
        message: "Hey! I'm planning a big corporate event and need custom caps for our team",
        expectedContext: ["corporate", "team", "event"],
        description: "Initial inquiry - establishing context"
    },
    {
        step: 2, 
        message: "We're thinking around 400-500 pieces, maybe split between two different designs?",
        expectedContext: ["400", "500", "two designs", "split"],
        description: "Quantity range and design complexity"
    },
    {
        step: 3,
        message: "Actually, let's go with 480 total - 240 black caps with our logo on front, and 240 navy caps with a different design on the back",
        expectedContext: ["480", "240 black", "240 navy", "front logo", "back design"],
        description: "Specific quantities and placement details"
    },
    {
        step: 4,
        message: "For the black ones, we want 3D embroidery - really make it pop, you know? And can we do rubber patches on the navy ones?",
        expectedContext: ["black", "3D embroidery", "navy", "rubber patches", "pop"],
        description: "Logo type specifications with personality"
    },
    {
        step: 5,
        message: "Oh, and I forgot - we need these for an outdoor event, so what's the best fabric for that? Something breathable?",
        expectedContext: ["outdoor event", "breathable", "fabric"],
        description: "Additional requirements based on use case"
    },
    {
        step: 6,
        message: "What about accessories? We're trying to create a premium feel for our VIP clients",
        expectedContext: ["accessories", "premium feel", "VIP clients"],
        description: "Exploring premium options"
    },
    {
        step: 7,
        message: "Actually, can we change the navy quantity to 260? We got more RSVPs than expected",
        expectedContext: ["navy", "260", "change", "RSVPs"],
        description: "Quantity modification mid-conversation"
    },
    {
        step: 8,
        message: "So just to confirm - 220 black caps with 3D embroidery, 260 navy caps with rubber patches, total 480. What's our cost looking like?",
        expectedContext: ["220 black", "3D embroidery", "260 navy", "rubber patches", "480 total", "cost"],
        description: "Confirmation and pricing inquiry"
    },
    {
        step: 9,
        message: "That sounds good! Can we add hang tags to make them look more professional?",
        expectedContext: ["hang tags", "professional", "sounds good"],
        description: "Final accessory addition"
    },
    {
        step: 10,
        message: "Perfect! Let's proceed with the order. When can we expect delivery?",
        expectedContext: ["proceed", "order", "delivery", "when"],
        description: "Order confirmation and timeline question"
    },
    {
        step: 11,
        message: "Go ahead and create the order please",
        expectedContext: ["create order", "go ahead"],
        description: "Final order creation command"
    }
];

class OrderAIStressTest {
    constructor() {
        this.conversationId = null;
        this.results = [];
        this.startTime = Date.now();
        this.memoryFailures = [];
        this.orderCreated = false;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async sendMessage(message, stepInfo) {
        console.log(`\n🔄 STEP ${stepInfo.step}: ${stepInfo.description}`);
        console.log(`📝 Message: "${message}"`);
        
        const startTime = Date.now();
        
        try {
            const response = await fetch(`${API_BASE}/api/order-ai`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    context: 'order-conversion',
                    conversationId: this.conversationId,
                    conversationContext: {},
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const responseTime = Date.now() - startTime;

            // Update conversation ID
            if (data.conversationId) {
                this.conversationId = data.conversationId;
            }

            // Analyze response
            const analysis = this.analyzeResponse(data.response, stepInfo, responseTime);
            this.results.push(analysis);

            console.log(`⏱️  Response time: ${responseTime}ms`);
            console.log(`🤖 AI Response: "${data.response.substring(0, 150)}${data.response.length > 150 ? '...' : ''}"`);
            console.log(`🧠 Memory Score: ${analysis.memoryScore}/10`);
            
            if (analysis.memoryFailures.length > 0) {
                console.log(`❌ Memory Failures: ${analysis.memoryFailures.join(', ')}`);
            }
            
            if (analysis.orderDetected) {
                console.log(`✅ Order Creation Detected!`);
                this.orderCreated = true;
            }

            return data;

        } catch (error) {
            console.error(`❌ STEP ${stepInfo.step} FAILED:`, error.message);
            this.results.push({
                step: stepInfo.step,
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime
            });
            throw error;
        }
    }

    analyzeResponse(response, stepInfo, responseTime) {
        const lowerResponse = response.toLowerCase();
        
        // Memory retention test
        const memoryScore = this.calculateMemoryScore(lowerResponse, stepInfo.step);
        const memoryFailures = this.checkMemoryFailures(lowerResponse, stepInfo.step);
        
        // Check for order creation
        const orderDetected = this.checkOrderCreation(lowerResponse);
        
        // Response quality metrics
        const isRobotic = this.checkRoboticResponse(response);
        const hasPersonality = this.checkPersonality(response);
        
        return {
            step: stepInfo.step,
            success: true,
            responseTime,
            memoryScore,
            memoryFailures,
            orderDetected,
            isRobotic,
            hasPersonality,
            responseLength: response.length,
            conversationId: this.conversationId
        };
    }

    calculateMemoryScore(response, step) {
        let score = 10;
        
        // Check retention of key information from previous steps
        if (step >= 3) {
            // Should remember 480 total pieces
            if (!response.includes('480')) score -= 2;
        }
        
        if (step >= 4) {
            // Should remember black caps and navy caps
            if (!response.includes('black') && !response.includes('navy')) score -= 2;
        }
        
        if (step >= 7) {
            // Should remember the change to 260 navy caps
            if (response.includes('240 navy') && !response.includes('260')) score -= 3;
        }
        
        if (step >= 8) {
            // Should remember 220 black and 260 navy
            if (!response.includes('220') && !response.includes('260')) score -= 2;
        }
        
        return Math.max(0, score);
    }

    checkMemoryFailures(response, step) {
        const failures = [];
        
        // Specific memory checks based on conversation flow
        if (step >= 3 && !response.includes('480')) {
            failures.push('Forgot total quantity (480)');
        }
        
        if (step >= 8 && response.includes('150')) {
            failures.push('Defaulting to wrong quantity (150)');
        }
        
        if (step >= 4 && step >= 8) {
            if (!response.includes('embroidery') && !response.includes('3d')) {
                failures.push('Forgot 3D embroidery specification');
            }
            if (!response.includes('rubber') && !response.includes('patch')) {
                failures.push('Forgot rubber patch specification');
            }
        }
        
        return failures;
    }

    checkOrderCreation(response) {
        return (
            response.includes('order created') ||
            response.includes('ord-') ||
            response.includes('reference') ||
            response.includes('order confirmation')
        );
    }

    checkRoboticResponse(response) {
        const roboticPatterns = [
            'Custom Cap Order Assistant',
            '**Popular Order Options:**',
            'What I Need for Your Quote:',
            'Ready for exact pricing?'
        ];
        
        return roboticPatterns.some(pattern => response.includes(pattern));
    }

    checkPersonality(response) {
        const personalityIndicators = [
            'sounds like', 'great choice', 'awesome', 'perfect', 
            'i can help', "let's", 'definitely', 'absolutely'
        ];
        
        return personalityIndicators.some(indicator => 
            response.toLowerCase().includes(indicator)
        );
    }

    generateReport() {
        const totalTime = Date.now() - this.startTime;
        const successfulSteps = this.results.filter(r => r.success).length;
        const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length;
        const avgMemoryScore = this.results.reduce((sum, r) => sum + (r.memoryScore || 0), 0) / this.results.length;
        const roboticResponses = this.results.filter(r => r.isRobotic).length;
        const personalityCount = this.results.filter(r => r.hasPersonality).length;
        
        const report = {
            timestamp: new Date().toISOString(),
            totalTime: `${(totalTime / 1000).toFixed(2)}s`,
            conversationId: this.conversationId,
            results: {
                totalSteps: CONVERSATION_STEPS.length,
                successfulSteps,
                successRate: `${((successfulSteps / CONVERSATION_STEPS.length) * 100).toFixed(1)}%`,
                orderCreated: this.orderCreated
            },
            performance: {
                avgResponseTime: `${avgResponseTime.toFixed(0)}ms`,
                maxResponseTime: `${Math.max(...this.results.map(r => r.responseTime))}ms`,
                minResponseTime: `${Math.min(...this.results.map(r => r.responseTime))}ms`
            },
            memory: {
                avgMemoryScore: `${avgMemoryScore.toFixed(1)}/10`,
                memoryFailures: this.results.flatMap(r => r.memoryFailures || [])
            },
            quality: {
                roboticResponses,
                personalityResponses: personalityCount,
                humanLikeRatio: `${((personalityCount / this.results.length) * 100).toFixed(1)}%`
            },
            stepDetails: this.results
        };

        return report;
    }

    async runTest() {
        console.log('🚀 Starting ORDER AI Stress Test');
        console.log(`📊 Testing ${CONVERSATION_STEPS.length} conversation steps`);
        console.log(`🎯 Target: Memory retention, human-like responses, order creation`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        for (const step of CONVERSATION_STEPS) {
            try {
                await this.sendMessage(step.message, step);
                
                // Add realistic delay between messages
                if (step.step < CONVERSATION_STEPS.length) {
                    console.log(`⏸️  Waiting ${DELAY_BETWEEN_MESSAGES/1000}s before next message...`);
                    await this.delay(DELAY_BETWEEN_MESSAGES);
                }
                
            } catch (error) {
                console.error(`💥 Test failed at step ${step.step}`);
                break;
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 GENERATING STRESS TEST REPORT');
        
        const report = this.generateReport();
        
        // Save report to file
        const reportPath = path.join(__dirname, 'order-ai-stress-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Display summary
        console.log('\n📊 STRESS TEST SUMMARY:');
        console.log(`✅ Success Rate: ${report.results.successRate}`);
        console.log(`🧠 Memory Score: ${report.memory.avgMemoryScore}`);
        console.log(`⏱️  Avg Response: ${report.performance.avgResponseTime}`);
        console.log(`🤖 Human-like: ${report.quality.humanLikeRatio}`);
        console.log(`📦 Order Created: ${report.results.orderCreated ? '✅ YES' : '❌ NO'}`);
        console.log(`💾 Conversation ID: ${report.conversationId}`);
        
        if (report.memory.memoryFailures.length > 0) {
            console.log('\n⚠️  MEMORY FAILURES:');
            report.memory.memoryFailures.forEach(failure => {
                console.log(`   ❌ ${failure}`);
            });
        }
        
        console.log(`\n📄 Full report saved: ${reportPath}`);
        
        // Exit with appropriate code
        const overallSuccess = report.results.successRate === '100.0%' && 
                             report.results.orderCreated && 
                             parseFloat(report.memory.avgMemoryScore) >= 7.0;
        
        console.log(`\n${overallSuccess ? '🎉 STRESS TEST PASSED!' : '❌ STRESS TEST FAILED!'}`);
        process.exit(overallSuccess ? 0 : 1);
    }
}

// Run the stress test
if (require.main === module) {
    const test = new OrderAIStressTest();
    test.runTest().catch(error => {
        console.error('💥 Stress test crashed:', error);
        process.exit(1);
    });
}

module.exports = OrderAIStressTest;