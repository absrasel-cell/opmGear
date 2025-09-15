import { NextRequest, NextResponse } from 'next/server';
import { getProductInfoBySpecs } from '@/lib/pricing/pricing-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const testCases = body.testCases || [];

    console.log('🧪 [DEBUG] Running product matching tests...');

    const results = [];

    // Predefined test cases if none provided
    const defaultTestCases = [
      {
        name: "7-panel curved bill",
        specs: {
          panelCount: 7,
          billShape: "curved",
          profile: "mid",
          structure: "structured"
        }
      },
      {
        name: "7-panel flat bill",
        specs: {
          panelCount: 7,
          billShape: "flat",
          profile: "high",
          structure: "structured"
        }
      },
      {
        name: "6-panel curved bill",
        specs: {
          panelCount: 6,
          billShape: "curved",
          profile: "mid",
          structure: "structured"
        }
      },
      {
        name: "6-panel flat bill",
        specs: {
          panelCount: 6,
          billShape: "flat",
          profile: "high",
          structure: "structured"
        }
      },
      {
        name: "5-panel flat bill",
        specs: {
          panelCount: 5,
          billShape: "flat",
          profile: "mid",
          structure: "structured"
        }
      },
      // Test the bill shape terminology fix
      {
        name: "User says 'curved' should match 'Slight Curved'",
        specs: {
          panelCount: 7,
          billShape: "curved",  // User input
          profile: "mid"
        }
      },
      {
        name: "Test exact product name lookup",
        specs: {
          productName: "7P CrownFrame 7 MSCS",
          panelCount: 7,
          billShape: "curved"
        }
      }
    ];

    const casesToTest = testCases.length > 0 ? testCases : defaultTestCases;

    for (const testCase of casesToTest) {
      console.log(`🧪 [DEBUG] Testing: ${testCase.name}`);

      const startTime = Date.now();
      const result = await getProductInfoBySpecs(testCase.specs);
      const duration = Date.now() - startTime;

      const testResult = {
        testCase: testCase.name,
        input: testCase.specs,
        output: result,
        duration: `${duration}ms`,
        success: !!result,
        matchDetails: result ? {
          productName: result.name,
          code: result.code,
          panelCount: result.panel_count,
          billShape: result.bill_shape,
          profile: result.profile,
          tier: result.pricing_tier?.tier_name
        } : null
      };

      results.push(testResult);

      console.log(`✅ [DEBUG] Test "${testCase.name}" result:`, {
        found: !!result,
        product: result?.name || 'No match',
        duration: `${duration}ms`
      });
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const total = results.length;

    console.log(`🎯 [DEBUG] Test summary: ${successful}/${total} tests passed`);

    return NextResponse.json({
      summary: {
        total,
        successful,
        failed: total - successful,
        successRate: `${((successful / total) * 100).toFixed(1)}%`
      },
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DEBUG] Test matching failed:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}