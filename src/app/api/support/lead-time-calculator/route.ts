import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client lazily to handle missing env vars during build
let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

interface LeadTimeRequest {
 leadTimeStr: string;
 logoSetup: string;
 deliveryType: string;
 totalQuantity: number;
 lines?: Array<{ color: string; size: string; quantity: number }>;
 accessoriesSelections: Array<any>;
 capSetupSelections: Array<any>;
 piecesPerBox?: number;
 todayDate: string;
}

export async function POST(request: NextRequest) {
 try {
  const body: LeadTimeRequest = await request.json();
  
  const prompt = `You are a professional lead time and packaging calculator for custom cap orders.

Given the following order details, calculate lead time (days + delivery date) and box packaging plan.

Input Data:
- Lead Time String: "${body.leadTimeStr}"
- Logo Setup: "${body.logoSetup}"
- Delivery Type: "${body.deliveryType}"
- Total Quantity: ${body.totalQuantity}
- Lines: ${JSON.stringify(body.lines || [])}
- Accessories: ${JSON.stringify(body.accessoriesSelections)}
- Cap Setup: ${JSON.stringify(body.capSetupSelections)}
- Pieces Per Box: ${body.piecesPerBox || 48}
- Today Date: ${body.todayDate}

Lead Time Calculation Rules:
1. Parse base from leadTimeStr: Blank = n×7 days, Decorated = m×7 days. If missing → 7 days each.
2. If logoSetup = "Blank" use Blank base, else use Decorated.
3. Add days for logo complexity:
  - TwoLogo/ThreeLogo → +1 day
  - FourLogo → +2 days
4. Delivery adders:
  - Blank: Regular +8, Priority +4
  - Decorated: Regular +5, Priority +3
5. Quantity: floor(totalQuantity/1000) × 2 days
6. Colors: floor(lines.length / 2) days
7. Accessories+CapSetup: floor((accessoriesCount + capSetupCount)/2) days

Box Packaging Rules (Production Orders):
Box options (pieces, max capacity, dims in cm, inner box count, volume in cm³):
- 200 pieces (max 210): 96×44×38, 4×(94×21×18), vol=160,128
- 144 pieces (max 155): 70×44×38, 4×(68×21×18), vol=116,960
- 100 pieces (max 110): 60×44×38, vol=100,320
- 72 pieces (max 80): 70×44×21, vol=64,680
- 48 pieces (max 55): 60×43×20, vol=51,600
- 24 pieces (max 30): 70×22×20, vol=30,800

UPDATED Box Selection Priority Rules:
1. **Default preference**: Use 144-piece boxes as the primary option
2. **Rounded quantities** (multiples of 100, 200, 400, 600): Prefer 200-piece boxes
3. **Small singular orders** (48-60 pieces only): Use 48-piece boxes as last resort
4. **Special cases**:
  - 400 or 600 → only 200-piece boxes (inner = 50/inner)
  - 432 → 3×144 boxes (36/inner)
  - 288 → 2×144 boxes instead of 6×48 boxes

Allocation algorithm:
1. Check if quantity is rounded (multiples of 200) → use 200-piece boxes
2. For quantities 144-300: prefer 144-piece boxes
3. For quantities 48-60 (singular small orders): use 48-piece boxes
4. For larger quantities: prioritize 144-piece boxes over 48-piece boxes
5. Mix box sizes only when necessary for optimal fit

Weight calculations:
- Net weight = totalQuantity × 0.12 kg
- Chargeable weight = ceil(Σ(volume/5000 × count)) + boxCount

Return ONLY a valid JSON response in this exact format:
{
 "leadTime": {
  "totalDays": 15,
  "deliveryDate": "2025-09-17",
  "details": ["Base: 7 days (Decorated)", "Regular delivery: +5 days", "Quantity (${body.totalQuantity}): +3 days"]
 },
 "boxes": {
  "lines": [
   {"label": "Mixed Colors", "count": 2, "pieces": 72, "dimensions": "70×44×21", "volume": 64680}
  ],
  "totalBoxes": 2,
  "netWeightKg": 17.3,
  "chargeableWeightKg": 25
 }
}`;

  const completion = await getOpenAIClient().chat.completions.create({
   model: 'gpt-4o-mini',
   messages: [
    {
     role: 'system',
     content: 'You are a professional lead time and packaging calculator. Return only valid JSON responses.'
    },
    {
     role: 'user',
     content: prompt
    }
   ],
   temperature: 0.1,
   max_tokens: 1000,
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) {
   throw new Error('No response from AI model');
  }

  // Parse the JSON response
  let calculationResult;
  try {
   calculationResult = JSON.parse(responseContent);
  } catch (parseError) {
   // If JSON parsing fails, try to extract JSON from the response
   const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
   if (jsonMatch) {
    calculationResult = JSON.parse(jsonMatch[0]);
   } else {
    throw new Error('Invalid JSON response from AI model');
   }
  }

  return NextResponse.json(calculationResult);

 } catch (error) {
  console.error('Lead time calculation error:', error);
  return NextResponse.json(
   { error: 'Failed to calculate lead time and packaging' },
   { status: 500 }
  );
 }
}