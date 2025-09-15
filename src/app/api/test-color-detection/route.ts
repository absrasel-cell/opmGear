import { NextRequest, NextResponse } from 'next/server';
import { parseOrderRequirements } from '@/lib/order-ai-core';
import { supportAIPricing } from '@/lib/support-ai/step-by-step-pricing';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('🧪 [COLOR-TEST] Testing color detection with message:', message);

    // Test 1: order-ai-core parsing
    const orderRequirements = parseOrderRequirements(message);
    console.log('🎯 [COLOR-TEST] Order AI Core result:', {
      color: orderRequirements.color,
      detectedColor: orderRequirements.color
    });

    // Test 2: Support AI step-by-step parsing (analyzeCapRequirements method)
    const supportAI = supportAIPricing as any;
    const capAnalysis = await supportAI.analyzeCapRequirements(message);
    console.log('🎨 [COLOR-TEST] Support AI Cap Analysis result:', {
      detectedColor: capAnalysis.color,
      fullAnalysis: capAnalysis
    });

    // Test 3: Direct color extraction method
    const extractColorFromText = (text: string): string | null => {
      const lowerText = text.toLowerCase();

      // Enhanced color detection with split color support (like "Royal/Black")
      const slashPattern = /(\w+)\/(\w+)/i;
      const slashMatch = text.match(slashPattern);

      if (slashMatch) {
        const part1 = slashMatch[1];
        const part2 = slashMatch[2];

        const knownColors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
                            'pink', 'brown', 'gray', 'grey', 'navy', 'lime', 'olive', 'royal',
                            'maroon', 'gold', 'charcoal', 'khaki', 'carolina', 'silver', 'teal',
                            'forest', 'burgundy', 'crimson', 'ivory', 'beige', 'tan', 'coral'];

        if (knownColors.includes(part1.toLowerCase()) && knownColors.includes(part2.toLowerCase())) {
          const normalizedPart1 = part1.charAt(0).toUpperCase() + part1.slice(1).toLowerCase();
          const normalizedPart2 = part2.charAt(0).toUpperCase() + part2.slice(1).toLowerCase();
          const normalizedColor = `${normalizedPart1}/${normalizedPart2}`;
          return normalizedColor;
        }
      }

      // Single color patterns
      const colorPatterns = [
        /(?:color:?\s*|in\s+|cap\s+)(\w+)/i,
        /(?:make\s+it\s+)(\w+)/i,
        /(?:^|\s)(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)(?:\s|$|,)/i
      ];

      for (const pattern of colorPatterns) {
        const colorMatch = text.match(pattern);
        if (colorMatch) {
          const detectedColor = colorMatch[1] || colorMatch[0].trim();
          const normalizedColor = detectedColor.charAt(0).toUpperCase() + detectedColor.slice(1).toLowerCase();
          return normalizedColor;
        }
      }

      return null;
    };

    const directColorTest = extractColorFromText(message);
    console.log('🧪 [COLOR-TEST] Direct extraction test result:', directColorTest);

    return NextResponse.json({
      success: true,
      tests: {
        originalMessage: message,
        orderAICore: {
          detectedColor: orderRequirements.color,
          method: 'parseOrderRequirements'
        },
        supportAICore: {
          detectedColor: capAnalysis.color,
          method: 'analyzeCapRequirements'
        },
        directExtraction: {
          detectedColor: directColorTest,
          method: 'extractColorFromText'
        }
      },
      analysis: {
        isSlashPattern: message.includes('/'),
        containsBlack: message.toLowerCase().includes('black'),
        containsGrey: message.toLowerCase().includes('grey') || message.toLowerCase().includes('gray'),
        expectedResult: 'Should detect Black/Grey for split color patterns'
      }
    });
  } catch (error) {
    console.error('❌ [COLOR-TEST] Error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}