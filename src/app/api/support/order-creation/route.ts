import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AIDataLoader } from '@/lib/ai/csv-loader';
import { ConversationService } from '@/lib/conversation';
import { AI_ASSISTANTS, formatAssistantResponse } from '@/lib/ai-assistants-config';
import { v4 as uuidv4 } from 'uuid';

interface OrderCreationRequest {
 message: string;
 intent: string;
 conversationHistory: Array<{
  role: 'user' | 'assistant' | 'system';
  content: string;
 }>;
 userProfile?: any;
 conversationId?: string;
 sessionId?: string;
 attachedFiles?: string[];
}

// 🚨 POST-PROCESSING FIX: Correct AI quantity-based pricing errors for ALL components
async function correctQuantityBasedPricing(orderResponse: any, pricingTiers: any[], logoOptions: any[], accessoryOptions: any[], deliveryOptions: any[]): Promise<any> {
  if (!orderResponse || !orderResponse.quoteData) {
    return orderResponse;
  }

  const quoteData = orderResponse.quoteData;
  const quantity = quoteData.pricing?.quantity || 0;
  
  if (quantity <= 0) {
    return orderResponse;
  }

  console.log('🔧 [POST-PROCESSING] Correcting ALL AI pricing components for quantity:', quantity);
  let correctionsMade = false;

  // ===== 1. CORRECT BASE CAP PRICING =====
  const capDetails = quoteData.capDetails;
  let tierName = 'Tier 3'; // Default for 7-panel caps
  
  if (capDetails?.productName?.includes('5-Panel') || capDetails?.productName?.includes('4-Panel')) {
    tierName = 'Tier 1';
  } else if (capDetails?.productName?.includes('6-Panel')) {
    tierName = 'Tier 2';
  }

  const tierPricing = pricingTiers.find(t => t.Name === tierName);
  if (tierPricing) {
    // Get correct unit price based on quantity
    let correctUnitPrice = 0;
    if (quantity >= 10000) correctUnitPrice = tierPricing.price10000;
    else if (quantity >= 2880) correctUnitPrice = tierPricing.price2880;
    else if (quantity >= 1152) correctUnitPrice = tierPricing.price1152;
    else if (quantity >= 576) correctUnitPrice = tierPricing.price576;
    else if (quantity >= 144) correctUnitPrice = tierPricing.price144;
    else correctUnitPrice = tierPricing.price48;

    const oldUnitPrice = quoteData.capDetails?.quantityBreakdown?.[0]?.unitCost || 0;
    const oldBaseProductCost = quoteData.pricing?.baseProductCost || 0;
    const newBaseProductCost = correctUnitPrice * quantity;

    if (Math.abs(oldUnitPrice - correctUnitPrice) > 0.01) {
      console.log('🔧 [POST-PROCESSING] Correcting base cap pricing:', {
        quantity,
        tierName,
        oldUnitPrice: `$${oldUnitPrice}`,
        correctUnitPrice: `$${correctUnitPrice}`,
        oldBaseProductCost: `$${oldBaseProductCost}`,
        newBaseProductCost: `$${newBaseProductCost}`
      });

      // Update all pricing references
      if (quoteData.capDetails?.quantityBreakdown?.[0]) {
        quoteData.capDetails.quantityBreakdown[0].unitCost = correctUnitPrice;
        quoteData.capDetails.quantityBreakdown[0].subtotal = newBaseProductCost;
      }
      
      if (quoteData.pricing) {
        const pricingDiff = newBaseProductCost - oldBaseProductCost;
        quoteData.pricing.baseProductCost = newBaseProductCost;
        if (quoteData.pricing.total) {
          quoteData.pricing.total += pricingDiff;
        }
      }

      // Update detailed breakdown
      if (quoteData.pricing?.detailedBreakdown?.blankCapsByColor?.[0]) {
        quoteData.pricing.detailedBreakdown.blankCapsByColor[0].unitPrice = `$${correctUnitPrice.toFixed(2)}`;
        quoteData.pricing.detailedBreakdown.blankCapsByColor[0].subtotal = `$${newBaseProductCost.toFixed(2)}`;
      }

      correctionsMade = true;
    }
  }

  // ===== 2. CORRECT CUSTOMIZATION PRICING (LOGOS) =====
  if (quoteData.customization?.logos && Array.isArray(quoteData.customization.logos)) {
    let totalLogoCostDiff = 0;

    quoteData.customization.logos.forEach((logo: any, index: number) => {
      // Map AI logo names to CSV names
      let csvLogoName = '';
      let csvSize = logo.size || 'Small';
      let csvApplication = 'Direct';

      if (logo.type?.includes('Leather')) {
        csvLogoName = 'Leather';
        csvApplication = 'Patch';
      } else if (logo.type?.includes('Rubber')) {
        csvLogoName = 'Rubber';
        csvApplication = 'Patch';
      } else if (logo.type?.includes('3D Embroidery')) {
        csvLogoName = '3D Embroidery';
        csvApplication = 'Direct';
      } else if (logo.type?.includes('Flat Embroidery') || logo.type?.includes('Size Embroidery')) {
        csvLogoName = 'Flat Embroidery';
        csvApplication = 'Direct';
      }

      if (csvLogoName) {
        // Find correct logo pricing in CSV
        const logoOption = logoOptions.find(l => 
          (l.Name === csvLogoName || l.Name?.includes(csvLogoName)) &&
          l.Size === csvSize &&
          l.Application === csvApplication
        );

        if (logoOption) {
          // Get correct unit price based on quantity
          let correctLogoUnitPrice = 0;
          if (quantity >= 20000) correctLogoUnitPrice = logoOption.price20000 || 0;
          else if (quantity >= 10000) correctLogoUnitPrice = logoOption.price10000 || 0;
          else if (quantity >= 2880) correctLogoUnitPrice = logoOption.price2880 || 0;
          else if (quantity >= 1152) correctLogoUnitPrice = logoOption.price1152 || 0;
          else if (quantity >= 576) correctLogoUnitPrice = logoOption.price576 || 0;
          else if (quantity >= 144) correctLogoUnitPrice = logoOption.price144 || 0;
          else correctLogoUnitPrice = logoOption.price48 || 0;

          const oldLogoUnitPrice = logo.unitCost || 0;
          const oldLogoTotalCost = logo.totalCost || 0;
          const newLogoTotalCost = correctLogoUnitPrice * quantity;

          if (Math.abs(oldLogoUnitPrice - correctLogoUnitPrice) > 0.01) {
            console.log(`🔧 [POST-PROCESSING] Correcting ${csvLogoName} pricing:`, {
              logoType: logo.type,
              size: csvSize,
              oldUnitPrice: `$${oldLogoUnitPrice}`,
              correctUnitPrice: `$${correctLogoUnitPrice}`,
              oldTotalCost: `$${oldLogoTotalCost}`,
              newTotalCost: `$${newLogoTotalCost}`
            });

            // Update logo pricing
            logo.unitCost = correctLogoUnitPrice;
            logo.totalCost = newLogoTotalCost;

            const logoCostDiff = newLogoTotalCost - oldLogoTotalCost;
            totalLogoCostDiff += logoCostDiff;

            correctionsMade = true;
          }
        }
      }
    });

    // Update total logo cost
    if (totalLogoCostDiff !== 0) {
      if (quoteData.pricing) {
        quoteData.pricing.logosCost = (quoteData.pricing.logosCost || 0) + totalLogoCostDiff;
        if (quoteData.pricing.total) {
          quoteData.pricing.total += totalLogoCostDiff;
        }
      }
    }
  }

  // ===== 3. CORRECT ACCESSORY PRICING =====
  if (quoteData.customization?.accessories && Array.isArray(quoteData.customization.accessories)) {
    let totalAccessoryCostDiff = 0;

    quoteData.customization.accessories.forEach((accessory: any, index: number) => {
      // Map AI accessory names to CSV names
      let csvAccessoryName = '';
      if (accessory.type?.includes('Hang Tag')) {
        csvAccessoryName = 'Hang Tag';
      } else if (accessory.type?.includes('Sticker')) {
        csvAccessoryName = 'Sticker';
      } else if (accessory.type?.includes('Label')) {
        csvAccessoryName = 'Inside Label';
      } else if (accessory.type?.includes('B-Tape')) {
        csvAccessoryName = 'B-Tape Print';
      }

      if (csvAccessoryName) {
        const accessoryOption = accessoryOptions.find(a => a.Name === csvAccessoryName);
        
        if (accessoryOption) {
          // Get correct unit price based on quantity
          let correctAccessoryUnitPrice = 0;
          if (quantity >= 10000) correctAccessoryUnitPrice = accessoryOption.price10000;
          else if (quantity >= 2880) correctAccessoryUnitPrice = accessoryOption.price2880;
          else if (quantity >= 1152) correctAccessoryUnitPrice = accessoryOption.price1152;
          else if (quantity >= 576) correctAccessoryUnitPrice = accessoryOption.price576;
          else if (quantity >= 144) correctAccessoryUnitPrice = accessoryOption.price144;
          else correctAccessoryUnitPrice = accessoryOption.price48;

          const oldAccessoryUnitPrice = accessory.unitCost || 0;
          const oldAccessoryTotalCost = accessory.totalCost || 0;
          const newAccessoryTotalCost = correctAccessoryUnitPrice * quantity;

          if (Math.abs(oldAccessoryUnitPrice - correctAccessoryUnitPrice) > 0.01) {
            console.log(`🔧 [POST-PROCESSING] Correcting ${csvAccessoryName} pricing:`, {
              oldUnitPrice: `$${oldAccessoryUnitPrice}`,
              correctUnitPrice: `$${correctAccessoryUnitPrice}`,
              oldTotalCost: `$${oldAccessoryTotalCost}`,
              newTotalCost: `$${newAccessoryTotalCost}`
            });

            // Update accessory pricing
            accessory.unitCost = correctAccessoryUnitPrice;
            accessory.totalCost = newAccessoryTotalCost;

            const accessoryCostDiff = newAccessoryTotalCost - oldAccessoryTotalCost;
            totalAccessoryCostDiff += accessoryCostDiff;

            correctionsMade = true;
          }
        }
      }
    });

    // Update total accessory cost
    if (totalAccessoryCostDiff !== 0) {
      if (quoteData.pricing) {
        quoteData.pricing.accessoriesCost = (quoteData.pricing.accessoriesCost || 0) + totalAccessoryCostDiff;
        if (quoteData.pricing.total) {
          quoteData.pricing.total += totalAccessoryCostDiff;
        }
      }
    }
  }

  // ===== 4. CORRECT DELIVERY PRICING =====
  if (quoteData.delivery) {
    const deliveryMethod = quoteData.delivery.method || 'Regular Delivery';
    const deliveryOption = deliveryOptions.find(d => d.Name === deliveryMethod);
    
    if (deliveryOption) {
      // Get correct unit price based on quantity
      let correctDeliveryUnitPrice = 0;
      if (quantity >= 20000) correctDeliveryUnitPrice = deliveryOption.price20000;
      else if (quantity >= 10000) correctDeliveryUnitPrice = deliveryOption.price10000;
      else if (quantity >= 2880) correctDeliveryUnitPrice = deliveryOption.price2880;
      else if (quantity >= 1152) correctDeliveryUnitPrice = deliveryOption.price1152;
      else if (quantity >= 576) correctDeliveryUnitPrice = deliveryOption.price576;
      else if (quantity >= 144) correctDeliveryUnitPrice = deliveryOption.price144;
      else correctDeliveryUnitPrice = deliveryOption.price48;

      const oldDeliveryUnitPrice = quoteData.delivery.unitCost || 0;
      const oldDeliveryTotalCost = quoteData.delivery.totalCost || 0;
      const newDeliveryTotalCost = correctDeliveryUnitPrice * quantity;

      if (Math.abs(oldDeliveryUnitPrice - correctDeliveryUnitPrice) > 0.01) {
        console.log('🔧 [POST-PROCESSING] Correcting delivery pricing:', {
          method: deliveryMethod,
          oldUnitPrice: `$${oldDeliveryUnitPrice}`,
          correctUnitPrice: `$${correctDeliveryUnitPrice}`,
          oldTotalCost: `$${oldDeliveryTotalCost}`,
          newTotalCost: `$${newDeliveryTotalCost}`
        });

        // Update delivery pricing
        quoteData.delivery.unitCost = correctDeliveryUnitPrice;
        quoteData.delivery.totalCost = newDeliveryTotalCost;

        const deliveryCostDiff = newDeliveryTotalCost - oldDeliveryTotalCost;
        if (quoteData.pricing) {
          quoteData.pricing.deliveryCost = newDeliveryTotalCost;
          if (quoteData.pricing.total) {
            quoteData.pricing.total += deliveryCostDiff;
          }
        }

        correctionsMade = true;
      }
    }
  }

  // ===== 5. UPDATE CUSTOMER MESSAGE =====
  if (correctionsMade && orderResponse.message) {
    console.log('🔧 [POST-PROCESSING] Updating customer message with corrected pricing');

    // Update base cap pricing in message
    const oldCapPricePattern = /pieces\s+×\s+\$[\d.]+\s+=\s+\$[\d,]+\.?\d*/g;
    const newCapCalculation = `pieces × $${tierPricing ? (quantity >= 576 ? tierPricing.price576 : quantity >= 144 ? tierPricing.price144 : tierPricing.price48).toFixed(2) : '0.00'} = $${quoteData.pricing?.baseProductCost?.toFixed(2) || '0.00'}`;
    
    // Update customization pricing in message (this is complex, so we'll regenerate key sections)
    if (quoteData.customization?.logos) {
      quoteData.customization.logos.forEach((logo: any) => {
        const logoPattern = new RegExp(`${logo.type}.*?\\$[\\d,]+\\.\\d+`, 'g');
        const newLogoLine = `${logo.type}: ${quantity} pieces × $${logo.unitCost?.toFixed(2) || '0.00'} = $${logo.totalCost?.toFixed(2) || '0.00'}`;
        orderResponse.message = orderResponse.message.replace(logoPattern, newLogoLine);
      });
    }

    // Update total in message
    const totalPattern = /💰.*?Total Order.*?\$[\d,]+\.?\d*/g;
    const newTotal = `💰 **Total Order: $${(quoteData.pricing?.total || 0).toFixed(2)}**`;
    orderResponse.message = orderResponse.message.replace(totalPattern, newTotal);
  }

  if (correctionsMade) {
    console.log('✅ [POST-PROCESSING] All pricing components corrected successfully');
  } else {
    console.log('✅ [POST-PROCESSING] All pricing already correct, no changes needed');
  }

  return orderResponse;
}

export async function POST(request: NextRequest) {
 try {
  const body: OrderCreationRequest = await request.json();
  const { message, intent, conversationHistory, userProfile, conversationId, sessionId, attachedFiles } = body;

  if (!message?.trim() && (!attachedFiles || attachedFiles.length === 0)) {
   return NextResponse.json(
    { error: 'Message or attached files are required' },
    { status: 400 }
   );
  }

  // Handle image analysis if files are attached
  let imageAnalysisData = null;
  if (attachedFiles && attachedFiles.length > 0) {
   try {
    console.log('🔍 Starting image analysis for', attachedFiles.length, 'files:', attachedFiles);
    
    const analysisResponse = await fetch(`${request.nextUrl.origin}/api/support/image-analysis`, {
     method: 'POST',
     headers: {
      'Content-Type': 'application/json',
     },
     body: JSON.stringify({
      imageUrls: attachedFiles,
      analysisType: 'logo' // Default to logo analysis
     })
    });

    if (analysisResponse.ok) {
     imageAnalysisData = await analysisResponse.json();
     console.log('✅ Image analysis successful:', {
      totalImages: imageAnalysisData.totalImages,
      resultsCount: imageAnalysisData.results?.length,
      hasAnalysis: imageAnalysisData.results?.some((r: any) => r.analysis),
      hasErrors: imageAnalysisData.results?.some((r: any) => r.error)
     });
     
     // Log first analysis result for debugging
     if (imageAnalysisData.results?.[0]?.analysis) {
      console.log('📋 First analysis result:', {
       recommendedMethod: imageAnalysisData.results[0].analysis.recommendedMethod,
       recommendedSize: imageAnalysisData.results[0].analysis.recommendedSize,
       recommendedPosition: imageAnalysisData.results[0].analysis.recommendedPosition,
       colorCount: imageAnalysisData.results[0].analysis.colorCount,
       moldChargeRequired: imageAnalysisData.results[0].analysis.moldChargeRequired
      });
     }
    } else {
     console.error('❌ Image analysis API error:', analysisResponse.status, analysisResponse.statusText);
     const errorText = await analysisResponse.text();
     console.error('Error details:', errorText);
    }
   } catch (error) {
    console.error('❌ Error calling image analysis API:', error);
    // Continue without image analysis data
   }
  }

  // Clear CSV cache to ensure fresh data (important for updated pricing)
  AIDataLoader.clearCache();
  
  // Load CSV data for AI context
  const [
   blankCapProducts,
   pricingTiers,
   logoOptions,
   colorOptions,
   sizeOptions,
   accessoryOptions,
   closureOptions,
   fabricOptions,
   deliveryOptions
  ] = await Promise.all([
   AIDataLoader.getBlankCapProducts(),
   AIDataLoader.getPricingTiers(),
   AIDataLoader.getLogoOptions(),
   AIDataLoader.getColorOptions(),
   AIDataLoader.getSizeOptions(),
   AIDataLoader.getAccessoryOptions(),
   AIDataLoader.getClosureOptions(),
   AIDataLoader.getFabricOptions(),
   AIDataLoader.getDeliveryOptions()
  ]);

  // Get default specifications
  const defaultSpecs = AIDataLoader.getDefaultCapSpecs();
  const defaultLogoSetup = await AIDataLoader.getDefaultLogoSetup();

  // Create conversation context and extract logo analysis data
  const conversationContext = (conversationHistory || [])
   .slice(-5)
   .map(msg => `${msg.role}: ${msg.content}`)
   .join('\n');

  // Extract logo analysis from conversation history metadata with enhanced search
  let previousLogoAnalysis = null;
  let logoAnalysisSource = null;
  
  // Search through conversation history for LogoCraft Pro analysis
  for (const msg of (conversationHistory || []).slice().reverse()) {
   // Check for enhanced LogoCraft Pro metadata first
   if (msg.role === 'assistant' && msg.metadata?.isLogoCraftProAnalysis && msg.metadata?.imageAnalysisResults) {
    previousLogoAnalysis = msg.metadata.imageAnalysisResults;
    logoAnalysisSource = 'LogoCraft Pro enhanced metadata';
    console.log('🎨 Found LogoCraft Pro analysis from enhanced metadata:', {
     hasAnalysis: !!previousLogoAnalysis,
     resultCount: previousLogoAnalysis?.length || 0,
     assistantUsed: msg.metadata?.assistant || 'unknown',
     analysisComplete: msg.metadata?.logoCraftProAnalysis?.analysisComplete || false,
     readyForQuote: msg.metadata?.logoCraftProAnalysis?.readyForQuoteCreation || false,
     primaryMethod: msg.metadata?.logoCraftProAnalysis?.primaryRecommendation?.method || 'unknown'
    });
    break;
   }
   
   // Check for imageAnalysisResults in metadata (LogoCraft Pro saves this)
   if (msg.role === 'assistant' && msg.metadata?.imageAnalysisResults) {
    previousLogoAnalysis = msg.metadata.imageAnalysisResults;
    logoAnalysisSource = 'LogoCraft Pro conversation';
    console.log('🎨 Found LogoCraft Pro analysis from conversation metadata:', {
     hasAnalysis: !!previousLogoAnalysis,
     resultCount: previousLogoAnalysis?.length || 0,
     assistantUsed: msg.metadata?.assistant || 'unknown',
     analysisQuality: previousLogoAnalysis?.some((r: any) => r.analysis && r.analysis.detectedText) ? 'detailed' : 'basic'
    });
    break;
   }
   
   // Also check for analysisResults in metadata (alternative format)
   if (msg.role === 'assistant' && msg.metadata?.analysisResults) {
    previousLogoAnalysis = msg.metadata.analysisResults;
    logoAnalysisSource = 'LogoCraft Pro analysisResults';
    console.log('🎨 Found LogoCraft Pro analysis from analysisResults metadata:', {
     hasAnalysis: !!previousLogoAnalysis,
     resultCount: previousLogoAnalysis?.length || 0
    });
    break;
   }
   
   // Check if this is a LogoCraft Pro message with logo analysis content
   if (msg.role === 'assistant' && 
     msg.metadata?.assistant === 'LOGO_EXPERT' &&
     msg.content?.includes('recommendation')) {
    // Extract analysis data from LogoCraft Pro message content
    logoAnalysisSource = 'LogoCraft Pro message content';
    console.log('🎨 Found LogoCraft Pro message, extracting analysis from content');
    
    // Create a synthetic analysis object from the LogoCraft Pro response
    previousLogoAnalysis = [{
     analysis: {
      logoType: 'Custom Logo',
      detectedText: 'Logo analysis available from LogoCraft Pro',
      recommendedMethod: 'As recommended by LogoCraft Pro',
      recommendedSize: 'As recommended by LogoCraft Pro',
      recommendedPosition: 'Front',
      complexity: 'Medium',
      moldChargeRequired: false,
      productionNotes: 'Follow LogoCraft Pro recommendations from previous message'
     },
     logoAnalysisMessage: msg.content
    }];
    break;
   }
  }

  // Get QuoteMaster AI assistant configuration
  const quoteMaster = AI_ASSISTANTS.QUOTE_MASTER;
  
  // Build image analysis context if available (current upload or previous LogoCraft Pro analysis)
  let imageAnalysisContext = '';
  let shouldUseAnalysisData = false;
  
  // Prioritize current image analysis, but fall back to previous LogoCraft Pro analysis
  const analysisDataToUse = imageAnalysisData?.results || previousLogoAnalysis;
  
  if (analysisDataToUse && analysisDataToUse.length > 0) {
   // Enhanced check for meaningful analysis results
   const hasRealAnalysis = analysisDataToUse.some((result: any) => {
    if (!result.analysis) return false;
    
    // Check for detailed analysis data
    const hasDetailedData = result.analysis.colorCount > 0 || 
                result.analysis.colors?.length > 0 ||
                result.analysis.productionNotes?.length > 50 ||
                result.analysis.detectedText?.length > 3 ||
                result.analysis.recommendedMethod?.length > 10;
    
    return hasDetailedData;
   });

   // Check if this is from LogoCraft Pro message content (has analysis message)
   const hasLogoCraftMessage = analysisDataToUse.some((result: any) => result.logoAnalysisMessage);

   if (hasRealAnalysis || hasLogoCraftMessage) {
    shouldUseAnalysisData = true;
    const dataSource = imageAnalysisData?.results ? 'CURRENT UPLOAD ANALYSIS' : 
             logoAnalysisSource?.includes('conversation') ? 'LOGOCRAFT PRO ANALYSIS DATA' :
             logoAnalysisSource?.includes('message') ? 'LOGOCRAFT PRO RECOMMENDATIONS' : 
             'PREVIOUS LOGO ANALYSIS';
    
    imageAnalysisContext = `\n\n🔍 **CRITICAL: LOGO ANALYSIS INTEGRATION (${dataSource}) - USE FOR COMPLETE QUOTE:**\n`;
    
    analysisDataToUse.forEach((result: any, index: number) => {
     if (result.logoAnalysisMessage) {
      // Handle LogoCraft Pro message content
      imageAnalysisContext += `\nLogoCraft Pro Analysis ${index + 1}:
LOGOCRAFT PRO PROVIDED DETAILED ANALYSIS AND RECOMMENDATIONS.
You MUST reference the LogoCraft Pro recommendations from the conversation history.

LogoCraft Pro Analysis Content:
${result.logoAnalysisMessage.substring(0, 500)}${result.logoAnalysisMessage.length > 500 ? '...' : ''}

IMPORTANT: Build upon LogoCraft Pro's analysis to create a COMPLETE quote including:
- Blank cap costs (from CSV data)
- Logo customization (following LogoCraft Pro recommendations) 
- Delivery costs (from CSV data)
- Total accurate pricing`;
     } else if (result.analysis) {
      const analysis = result.analysis;
      imageAnalysisContext += `\nDetailed Analysis ${index + 1} (MUST INTEGRATE):
- Logo Type: ${analysis.logoType || 'Custom Logo'}
- Detected Text: ${analysis.detectedText || 'Logo analysis available'}
- Color Count: ${analysis.colorCount || 'Multiple colors detected'}
- Colors: ${analysis.colors?.join(', ') || 'As analyzed by LogoCraft Pro'}
- REQUIRED Method: ${analysis.recommendedMethod || 'As recommended by LogoCraft Pro'}
- REQUIRED Size: ${analysis.recommendedSize || 'As recommended by LogoCraft Pro'}
- REQUIRED Position: ${analysis.recommendedPosition || 'Front'}
- Complexity: ${analysis.complexity || 'Medium'}
- Mold Charge Required: ${analysis.moldChargeRequired ? 'Yes' : 'No'}
${analysis.moldChargeRequired ? `- Estimated Mold Charge: $${analysis.estimatedMoldCharge || 'See CSV data'}` : ''}
- Production Notes: ${analysis.productionNotes || 'Follow professional logo analysis recommendations'}
${analysis.capSpecifications && Object.values(analysis.capSpecifications).some(v => v) ? 
`- Cap Specifications: ${JSON.stringify(analysis.capSpecifications, null, 2)}` : ''}`;
     }
     if (result.error) {
      imageAnalysisContext += `\nAnalysis Issue ${index + 1}: ${result.error}`;
     }
    });
    
    imageAnalysisContext += `\n\n**MANDATORY LOGOCRAFT PRO INTEGRATION INSTRUCTIONS:**
1. LogoCraft Pro has already analyzed the logo(s) uploaded by the customer
2. You MUST build a COMPLETE quote including ALL cost components:
  - Blank Cap Cost (from CSV pricing tiers)
  - Logo Customization Cost (based on LogoCraft Pro analysis)
  - Delivery Cost (from CSV delivery options)
3. Use LogoCraft Pro's method/size/position recommendations EXACTLY
4. Do NOT add generic default logos - use ONLY what LogoCraft Pro analyzed
5. Reference LogoCraft Pro's analysis in your customer response
6. Calculate accurate total pricing for complete order
7. If LogoCraft Pro specified premium options (Rubber/Leather patches), include mold charges
8. Create a professional quote that follows up on LogoCraft Pro's technical analysis

**QUOTE CREATION PRIORITY:**
Customer uploaded logo(s) → LogoCraft Pro analyzed → Now create COMPLETE quote with total pricing`;
   } else {
    imageAnalysisContext = `\n\n🔍 **LOGO ANALYSIS STATUS:**
Logo analysis data found but requires interpretation. Create quote with general logo customization guidance.`;
   }
  }

  // Comprehensive system prompt for CapCraft AI
  const systemPrompt = `You are ${quoteMaster.displayName} ${quoteMaster.icon}, ${quoteMaster.specialty} for US Custom Cap. You specialize in creating accurate quotes and orders based on customer requirements with artisanal attention to detail.

${imageAnalysisContext}

${shouldUseAnalysisData ? 
`🚨 CRITICAL LOGOCRAFT PRO INTEGRATION RULES:
- LogoCraft Pro has professionally analyzed the customer's uploaded logo(s)
- LogoCraft Pro provided ${logoAnalysisSource} with detailed recommendations 
- You MUST follow LogoCraft Pro's analysis for ALL logo specifications
- Create a COMPLETE quote: Blank Cap + Logo Customization + Delivery = Total
- Do NOT add generic default logos - use ONLY what LogoCraft Pro analyzed
- Reference LogoCraft Pro's professional analysis in your customer response
- Use LogoCraft Pro's exact method/size/position recommendations
- Include mold charges if LogoCraft Pro specified Rubber/Leather patches
- Your role: Take LogoCraft Pro's partial logo pricing and build complete order quote
- Show customer you're building upon the previous professional logo analysis` : 
''}

CRITICAL PREMIUM FABRIC RULE (READ FIRST):
When customer mentions "Acrylic", "Suede Cotton", "Air Mesh", "Camo", "Genuine Leather" etc. in their request:
1. These are PREMIUM FABRIC UPGRADES, not product names
2. ALWAYS calculate premium fabric cost: quantity × fabric_unit_price
3. ALWAYS set pricing.premiumFabricCost in JSON response (NOT zero!)
4. Example: "288 Acrylic caps" = Base cap cost + (288 × $0.8) premium fabric cost

CRITICAL PREMIUM CLOSURE RULE (READ SECOND):
When customer mentions "Fitted", "Flexfit", "Buckle", "Stretched" in their request:
1. These are PREMIUM CLOSURE UPGRADES that replace the default "Snapback"
2. ALWAYS calculate premium closure cost: quantity × closure_unit_price 
3. ALWAYS set pricing.premiumClosureCost in JSON response (NOT zero!)
4. ALWAYS set capDetails.closure to the premium closure name (NOT "Snapback")
5. Example: "288 Fitted caps" = Base cap cost + (288 × $0.30) premium closure cost
6. DO NOT confuse "Fitted" with Profile - "Fitted" is a CLOSURE type, not a Profile type

CRITICAL CONTEXT: ARTWORK ANALYSIS = SINGLE CAP STYLE ORDER
When processing artwork analysis, you are creating a quote for ONE specific cap design with ONE quantity.
This is NOT a catalog of options - it's a precise order specification.

PRODUCT STRUCTURE: Order = Blank Cap (compulsory) + Premium Fabric (if specified) + Customization (optional) + Delivery (compulsory) = Total Cost

DEFAULT SPECIFICATIONS (use when not specified):
- Panel Count: ${defaultSpecs.panelCount}
- Profile: ${defaultSpecs.profile}
- Structure: ${defaultSpecs.structure}
- Closure: ${defaultSpecs.closure}
- Solid Fabric: ${defaultSpecs.fabricSolid}
- Split Fabric: ${defaultSpecs.fabricSplit}
- Stitching: ${defaultSpecs.stitching}

DEFAULT LOGO SETUP (Position-Based Size Rules):
- Front Location: Large size (e.g., Large 3D Embroidery, Large Rubber Patch)
- Back/Left/Right Locations: Small size (e.g., Small 3D Embroidery, Small Flat Embroidery)
- Upper Bill: Medium size (e.g., Medium Flat Embroidery)
- Under Bill: Large size (e.g., Large Sublimated Print)

IMPORTANT POSITION-BASED SIZING RULES:
When customer requests "Rubber Patch on Front" → Use "Large Rubber Patch" (not Small)
When customer requests "3D Embroidery on Back" → Use "Small 3D Embroidery" (not Medium/Large)
When customer requests any logo on Left/Right → Use "Small" size
When customer requests Upper Bill logo → Use "Medium" size
When customer requests Under Bill logo → Use "Large" size

AVAILABLE DATA:

BLANK CAP PRODUCTS (All Panel Types Available):
4-Panel Caps:
${blankCapProducts.filter(p => p['Panel Count'] === '4-Panel').slice(0, 3).map(p => `${p.Name} - ${p.Profile} profile, ${p['Bill Shape']} bill, ${p.priceTier}, ${p['Structure Type']}`).join('\n')}

5-Panel Caps:
${blankCapProducts.filter(p => p['Panel Count'] === '5-Panel').slice(0, 5).map(p => `${p.Name} - ${p.Profile} profile, ${p['Bill Shape']} bill, ${p.priceTier}, ${p['Structure Type']}`).join('\n')}

6-Panel Caps:
${blankCapProducts.filter(p => p['Panel Count'] === '6-Panel').slice(0, 5).map(p => `${p.Name} - ${p.Profile} profile, ${p['Bill Shape']} bill, ${p.priceTier}, ${p['Structure Type']}`).join('\n')}

7-Panel Caps:
${blankCapProducts.filter(p => p['Panel Count'] === '7-Panel').map(p => `${p.Name} - ${p.Profile} profile, ${p['Bill Shape']} bill, ${p.priceTier}, ${p['Structure Type']}`).join('\n')}

PRICING TIERS - QUANTITY-BASED PRICING RULES:
${pricingTiers.map(t => `${t.Name}: 48pc=$${t.price48}, 144pc=$${t.price144}, 576pc=$${t.price576}, 1152pc=$${t.price1152}, 2880pc=$${t.price2880}, 10k+pc=$${t.price10000}`).join('\n')}

🚨 CRITICAL QUANTITY-BASED PRICING RULES (MUST FOLLOW):

**7-PANEL CAP (TIER 3) PRICING BY QUANTITY:**
• 48 pieces = $6.00 per cap
• 144 pieces = $4.25 per cap  
• 576 pieces = $4.00 per cap
• 1152+ pieces = $3.68 per cap

**6-PANEL CAP (TIER 2) PRICING BY QUANTITY:**
• 48 pieces = $5.50 per cap
• 144 pieces = $4.00 per cap
• 576 pieces = $3.75 per cap  
• 1152+ pieces = $3.63 per cap

**5-PANEL CAP (TIER 1) PRICING BY QUANTITY:**
• 48 pieces = $4.50 per cap
• 144 pieces = $3.75 per cap
• 576 pieces = $3.63 per cap
• 1152+ pieces = $3.55 per cap

EXAMPLE: Customer orders "144 pieces 7-Panel Cap" → Use $4.25 per cap (NOT $6.00!)
EXAMPLE: Customer orders "576 pieces 7-Panel Cap" → Use $4.00 per cap (NOT $6.00!)

CUSTOMIZATION OPTIONS (Per-Piece Pricing):

3D Embroidery (Direct Application):
${logoOptions.filter(l => l.Name === '3D Embroidery' && l.Application === 'Direct').map(l => `${l.Size} 3D Embroidery: 48pc=$${l.price48}, 144pc=$${l.price144}, 576pc=$${l.price576}, 1152pc=$${l.price1152}`).join('\n')}

Rubber Patches:
${logoOptions.filter(l => l.Name === 'Rubber').map(l => `${l.Size} Rubber Patch: 48pc=$${l.price48}, 144pc=$${l.price144}, 576pc=$${l.price576}, 1152pc=$${l.price1152} + ${l['Mold Charge']}`).join('\n')}

Flat Embroidery (Direct Application):
${logoOptions.filter(l => l.Name === 'Flat Embroidery' && l.Application === 'Direct').map(l => `${l.Size} Flat Embroidery: 48pc=$${l.price48}, 144pc=$${l.price144}, 576pc=$${l.price576}, 1152pc=$${l.price1152}`).join('\n')}

Leather Patches:
${logoOptions.filter(l => l.Name === 'Leather').map(l => `${l.Size} Leather Patch: 48pc=$${l.price48}, 144pc=$${l.price144}, 576pc=$${l.price576}, 1152pc=$${l.price1152} + ${l['Mold Charge']}`).join('\n')}

Mold Charges (One-Time):
${logoOptions.filter(l => l.Name === 'Mold Charge').map(l => `${l.Size} Mold Charge: $${l.price48} (applies to Rubber/Leather patches)`).join('\n')}

COLOR OPTIONS:
${colorOptions.map(c => `${c.Name} (${c.Type})`).join(', ')}

SIZE OPTIONS:
${sizeOptions.slice(0, 8).map(s => `${s.Size}: ${s['Head Circumference']}`).join(', ')}

CLOSURE OPTIONS:
Free Closures (Default):
- Snapback (Free)
- Velcro (Free)

Premium Closures (Add to Base Cost):
${closureOptions.filter(c => c.Type === 'Premium Closure').map(c => `${c.Name} - Cost: 48pc=$${c.price48}, 144pc=$${c.price144}, 576pc=$${c.price576}, 1152pc=$${c.price1152}`).join('\n')}

FABRIC OPTIONS:
Free Fabrics (Default):
${fabricOptions.filter(f => f.costType === 'Free').map(f => `${f.Name} (Free)`).join('\n')}

Premium Fabrics (Add to Base Cost):
${fabricOptions.filter(f => f.costType === 'Premium Fabric').map(f => `${f.Name} - Available in: ${f['Color Note']} - Cost: 48pc=$${f.price48}, 144pc=$${f.price144}, 576pc=$${f.price576}, 1152pc=$${f.price1152}`).join('\n')}

CRITICAL FABRIC COST CALCULATION RULES:
1. When customer mentions premium fabric names (Acrylic, Suede Cotton, Air Mesh, Camo, Genuine Leather, etc.), treat them as FABRIC UPGRADES, not product names
2. Premium fabric cost is ADDITIONAL to base product cost: Base Product Cost + (Premium Fabric Cost × Quantity) = Total
3. Example: "Acrylic Flat bill cap 288 pieces":
  - Base Product: 288 × $1.20 = $345.60
  - Acrylic Premium Fabric: 288 × $0.8 = $230.40
  - Total Base Cost: $345.60 + $230.40 = $576.00 (before customization/delivery)
4. Always show both components separately in calculations
5. MANDATORY: ALWAYS add premiumFabricCost to pricing object when premium fabric detected
6. MANDATORY: Include premium fabric line item in customer message breakdown

PREMIUM FABRIC DETECTION CHECKLIST:
- "Acrylic" → Premium Fabric Cost: quantity × $0.8
- "Suede Cotton" → Premium Fabric Cost: quantity × $0.8 
- "Air Mesh" → Premium Fabric Cost: quantity × $0.3
- "Genuine Leather" → Premium Fabric Cost: quantity × $1.7
- "PU Leather" → Premium Fabric Cost: quantity × $1.3
- "Camo" → Premium Fabric Cost: quantity × $0.35
- "Canvas" → Premium Fabric Cost: quantity × $0.35
- "Spandex" → Premium Fabric Cost: quantity × $0.35

PREMIUM CLOSURE DETECTION CHECKLIST:
- "Fitted" → Premium Closure Cost: quantity × $0.30 (for 576pc tier), $0.40 (for 144pc), $0.50 (for 48pc)
- "Flexfit" → Premium Closure Cost: quantity × $0.30 (for 576pc tier), $0.40 (for 144pc), $0.50 (for 48pc)
- "Buckle" → Premium Closure Cost: quantity × $0.30 (for 576pc tier), $0.35 (for 144pc), $0.50 (for 48pc)
- "Stretched" → Premium Closure Cost: quantity × $0.30 (for 576pc tier), $0.40 (for 144pc), $0.50 (for 48pc)

DELIVERY OPTIONS (Per-Piece Pricing - MULTIPLY BY QUANTITY):
${deliveryOptions.map(d => `${d.Name}: $${d.price48}/pc for 48pc order = $${d.price48 * 48} total, $${d.price144}/pc for 144pc order = $${d.price144 * 144} total, $${d.price576}/pc for 576pc order = $${d.price576 * 576} total (${d['Delivery Days']})`).join('\n')}

CRITICAL DELIVERY CALCULATION RULE:
For 48 pieces with Regular Delivery: 48 × $3.00 = $144.00 total (NOT $3.00!)
For 576 pieces with Regular Delivery: 576 × $1.90 = $1,094.40 total (NOT $1.90!)

IMPORTANT: Both delivery.totalCost AND pricing.deliveryCost must be the SAME calculated total.
Example: delivery.totalCost = 144, pricing.deliveryCost = 144 (both show $144.00)

ACCESSORY OPTIONS (Per-Piece Pricing - MULTIPLY BY QUANTITY):
${accessoryOptions.map(a => `${a.Name}: 48pc=$${a.price48}, 144pc=$${a.price144}, 576pc=$${a.price576}, 1152pc=$${a.price1152} per piece`).join('\n')}

CRITICAL ACCESSORY CALCULATION RULE:
When customer specifies accessories (B-Tape Print, Hang Tag, Inside Label, Sticker, etc.):
1. Calculate cost per accessory: quantity × accessory_unit_price
2. For 576 pieces with B-Tape Print: 576 × $0.20 = $115.20 total
3. For 576 pieces with Hang Tag: 576 × $0.30 = $172.80 total
4. Always include accessories cost in pricing.accessoriesCost field
5. Show accessories as separate line items in customer message breakdown

ACCESSORY NAME MAPPING FOR ARTWORK ANALYSIS:
- "B-Tape Print" → B-Tape Print ($0.20/pc for 576pc)
- "Brand Label" → Inside Label ($0.20/pc for 576pc) 
- "Main Label" → Inside Label ($0.20/pc for 576pc)
- "Size Label" → Inside Label ($0.20/pc for 576pc)
- Any label type → Inside Label ($0.20/pc for 576pc)
- "Hang Tag Label" → Hang Tag ($0.30/pc for 576pc)
- "Hang Tag" → Hang Tag ($0.30/pc for 576pc)
- When artwork analysis specifies accessories, map them to CSV names and calculate costs

COLOR COMBINATIONS AND CRITICAL PRICING RULES:
- Single color: When Front, Back, and Bill are the same color (e.g., "Black"), calculate cost ONCE for total quantity
- Two colors: Upper Bill/Under Bill/Front/Button = Color1, Sides/Back/Closure = Color2
- Three colors: Upper Bill/Under Bill/Button = Color1, Front = Color2, Back/Closure = Color3
- Camo colors = Camo fabric (adds cost)

CRITICAL: Do NOT multiply base cap cost by color positions. "Black front, Black back, Black bill" = ONE color (Black), NOT three separate colors!

PRICING CALCULATION (CRITICAL - CALCULATE CORRECTLY):
1. Find matching blank cap product and pricing tier
2. Calculate base cost: quantity × tier price
3. ADD PREMIUM FABRIC COSTS if customer specifies premium fabrics:
  - Acrylic: quantity × $0.8 (for 576pc tier), $1.0 (for 144pc), $1.2 (for 48pc)
  - Suede Cotton: quantity × $0.8 (for 576pc tier), $1.0 (for 144pc), $1.2 (for 48pc)
  - Air Mesh: quantity × $0.3 (for 576pc tier), $0.35 (for 144pc), $0.5 (for 48pc)
  - Genuine Leather: quantity × $1.7 (for 576pc tier), $1.8 (for 144pc), $2.0 (for 48pc)
  - EXAMPLE: "288pc Acrylic caps" = Base cost + (288 × $0.8) = Base cost + $230.40
  - CRITICAL: Set pricing.premiumFabricCost = calculated premium fabric total
4. ADD PREMIUM CLOSURE COSTS if customer specifies premium closures:
  - Fitted: quantity × $0.30 (for 576pc tier), $0.40 (for 144pc), $0.50 (for 48pc)
  - Flexfit: quantity × $0.30 (for 576pc tier), $0.40 (for 144pc), $0.50 (for 48pc) 
  - Buckle: quantity × $0.30 (for 576pc tier), $0.35 (for 144pc), $0.50 (for 48pc)
  - EXAMPLE: "288pc Fitted caps" = Base cost + (288 × $0.30) = Base cost + $86.40
  - CRITICAL: Set pricing.premiumClosureCost = calculated premium closure total
  - CRITICAL: Set capDetails.closure = "Fitted" (NOT "Snapback")
5. For each logo: (unit price × quantity) + mold charge (if applicable)
  - Large Rubber Patch: $1.20/unit × 576 = $691.20 + Large Mold Charge $80 = $771.20
  - Large 3D Embroidery: $0.12/unit × 576 = $69.12 (no mold charge)
  - DO NOT show only unit price - multiply by full quantity!
6. Add delivery costs: delivery unit price × quantity
  - Regular Delivery for 48pc: $3.00/unit × 48 = $144.00 (NOT $3.00 total!)
  - Regular Delivery for 576pc: $1.90/unit × 576 = $1,094.40
  - IMPORTANT: The CSV shows per-unit prices, not total prices!
7. Include all mold charges for patches (Rubber, Leather patches)
8. Sum all components for accurate total

EXAMPLE CALCULATION FOR 48pc BASIC ORDER (Tier 1):
- Base Product (Tier 1): 48 × $4.50 = $216.00
- Regular Delivery: 48 × $3.00 = $144.00 (NOT $3.00!)
- TOTAL: $360.00

EXAMPLE CALCULATION FOR 144pc ACRYLIC CAPS (Premium Fabric, Tier 2):
- Base Product (Tier 2): 144 × $4.00 = $576.00  
- Acrylic Premium Fabric: 144 × $1.0 = $144.00
- Regular Delivery: 144 × $2.20 = $316.80
- TOTAL: $1,036.80 (Base + Premium Fabric + Delivery)

EXAMPLE CALCULATION FOR 576pc FITTED CAPS (Premium Closure, Tier 3):
- Base Product (Tier 3): 576 × $4.00 = $2,304.00
- Fitted Premium Closure: 576 × $0.30 = $172.80
- Regular Delivery: 576 × $1.90 = $1,094.40
- TOTAL: $3,571.20 (Base + Premium Closure + Delivery)

EXAMPLE CALCULATION FOR 576pc WITH RUBBER PATCH + 3D EMBROIDERY (Tier 3):
- Base Product (Tier 3): 576 × $4.00 = $2,304.00
- Large Rubber Patch Front: $1.20 × 576 = $691.20 + $80 mold = $771.20
- Large 3D Embroidery Back: $0.12 × 576 = $69.12 
- Regular Delivery: $1.90 × 576 = $1,094.40
- TOTAL: $4,238.72 (not $1,670.40 or $0.85!)

CRITICAL PREMIUM FABRIC RECOGNITION PATTERNS:
When customer says "Acrylic Flat bill cap" or "Suede Cotton caps" or "Air Mesh hats":
1. Extract fabric name: "Acrylic", "Suede Cotton", "Air Mesh"
2. Find base cap product (ignore fabric name in product matching)
3. Add premium fabric cost as separate line item
4. Show calculation: Base Cost + Premium Fabric Cost = Subtotal

CRITICAL PREMIUM CLOSURE RECOGNITION PATTERNS:
When customer says "Fitted cap", "Flexfit baseball cap", "the cap needs to be Fitted", or "Buckle closure":
1. Extract closure name: "Fitted", "Flexfit", "Buckle", "Stretched" 
2. Set capDetails.closure to the premium closure name (NOT "Snapback")
3. Add premium closure cost as separate line item
4. Show calculation: Base Cost + Premium Closure Cost = Subtotal
5. IMPORTANT: "Fitted" is a CLOSURE type, NOT a Profile type (Profile options are High/Mid/Low)
6. NEVER confuse "Fitted" with cap structure or profile - it's purely a closure mechanism

DETAILED QUANTITY BREAKDOWN REQUIREMENTS:
When customer specifies different quantities per color/size/option, ALWAYS provide detailed breakdown:

1. Parse specific quantities from customer request (e.g., "Black/White 48, Khaki 144, Navy/Khaki 288, Red 96")
2. Show individual calculations for each color group
3. Include per-unit cost and subtotal for each group
4. Apply same customization costs to all pieces

RESPONSE FORMAT: Provide a detailed JSON response with:
{
 "message": "Conversational response with DETAILED BREAKDOWN shown to customer",
 "quoteData": {
  "quoteId": "Q-XXXXX",
  "isDraft": true,
  "capDetails": {
   "productName": "...",
   "profile": "...",
   "billShape": "...",
   "structure": "...",
   "closure": "...",
   "fabric": "...",
   "premiumFabric": "...", // If premium fabric specified
   "stitching": "...", // Required: Matching, Contrasting, or color name
   "colors": ["..."],
   "sizes": ["..."],
   "quantityBreakdown": [
    {"colors": "Black/White", "quantity": 48, "unitCost": 2.90, "subtotal": 139.20},
    {"colors": "Khaki", "quantity": 144, "unitCost": 2.90, "subtotal": 417.60},
    {"colors": "Navy/Khaki", "quantity": 288, "unitCost": 2.90, "subtotal": 835.20},
    {"colors": "Red", "quantity": 96, "unitCost": 2.90, "subtotal": 278.40}
   ]
  },
  "customization": {
   "logos": [{"location": "...", "type": "...", "size": "...", "unitCost": 0.0, "totalCost": 0.0, "moldCharge": 0.0}],
   "accessories": [...],
   "totalMoldCharges": 0.0
  },
  "delivery": {
   "method": "...",
   "leadTime": "...",
   "unitCost": 0.0,
   "totalCost": 0.0 // MUST BE: unitCost × quantity (e.g., $3.00 × 48 = $144.00)
  },
  "pricing": {
   "quantity": 100,
   "baseProductCost": 0.0,
   "premiumFabricCost": 0.0, // Add premium fabric as separate line item
   "premiumClosureCost": 0.0, // Add premium closure as separate line item
   "logosCost": 0.0,
   "accessoriesCost": 0.0,
   "moldChargesCost": 0.0,
   "deliveryCost": 0.0, // MUST MATCH delivery.totalCost (e.g., $144.00 for 48pc)
   "subtotal": 0.0,
   "total": 0.0,
   "detailedBreakdown": {
    "blankCapsByColor": [
     {"colors": "Black/White", "qty": 48, "unitPrice": "$4.50", "subtotal": "$216.00"},
     {"colors": "Khaki", "qty": 144, "unitPrice": "$4.25", "subtotal": "$612.00"},
     {"colors": "Navy/Khaki", "qty": 288, "unitPrice": "$3.75", "subtotal": "$1,080.00"},
     {"colors": "Red", "qty": 96, "unitPrice": "$6.00", "subtotal": "$576.00"}
    ],
    "premiumFabricBreakdown": {
     "fabricName": "Acrylic",
     "totalQuantity": 576,
     "unitPrice": "$0.80",
     "totalCost": "$460.80"
    },
    "premiumClosureBreakdown": {
     "closureName": "Fitted",
     "totalQuantity": 576,
     "unitPrice": "$0.30",
     "totalCost": "$172.80"
    },
    "customizationByColor": [
     {"colors": "All Colors", "logoType": "Large 3D Embroidery Front", "qty": 576, "unitPrice": "$0.12", "subtotal": "$69.12"}
    ],
    "accessoriesBreakdown": [
     {"accessoryType": "B-Tape Print", "qty": 576, "unitPrice": "$0.20", "subtotal": "$115.20"},
     {"accessoryType": "Hang Tag", "qty": 576, "unitPrice": "$0.30", "subtotal": "$172.80"}
    ],
    "deliveryBreakdown": {
     "method": "Regular Delivery",
     "totalQuantity": 576,
     "unitPrice": "$1.90",
     "totalCost": "$1,094.40"
    }
   }
  }
 },
 "actions": ["save_quote", "create_order", "modify_specs"]
}

User Profile: ${userProfile ? `${userProfile.name || 'Customer'} (${userProfile.email || 'No email'})` : 'Not authenticated'}`;

  const userPrompt = `${conversationContext ? `Previous conversation:\n${conversationContext}\n\n` : ''}Current request: "${message}"
${attachedFiles && attachedFiles.length > 0 ? `\n\n📁 CUSTOMER UPLOADED FILES: ${attachedFiles.length} file(s) for professional analysis
${shouldUseAnalysisData ? '✅ GPT-4o Vision analysis completed successfully - MANDATORY to use the analysis results above' : '⚠️ Image analysis returned generic data - provide general logo guidance'}\n` : ''}

Please create a detailed quote/order based on the customer's requirements${shouldUseAnalysisData ? ' and the SPECIFIC image analysis results provided above' : ''}. Use defaults where specifications are not provided. Calculate accurate pricing based on the CSV data.

${shouldUseAnalysisData ? 
`🎯 MANDATORY LOGOCRAFT PRO INTEGRATION:
- Customer previously uploaded logo(s) that LogoCraft Pro analyzed professionally
- LogoCraft Pro provided detailed analysis including method, size, position recommendations
- You MUST create a COMPLETE quote building upon LogoCraft Pro's analysis:
 * Blank Cap Pricing (compulsory - from CSV data)
 * Logo Customization (follow LogoCraft Pro recommendations exactly) 
 * Delivery Pricing (compulsory - from CSV data)
 * Total Accurate Order Cost
- Reference LogoCraft Pro's analysis to show continuity in service
- Do NOT add generic logos - use ONLY what LogoCraft Pro analyzed
- If LogoCraft Pro recommended Rubber/Leather patches, include mold charges
- Your goal: Complete the quote that LogoCraft Pro started with logo analysis` : 
'The customer may have uploaded files previously. Create quote with general logo customization options as needed.'}

IMPORTANT FOR CUSTOMER RESPONSES:
- If customer requests "breakdown by color" or specifies different quantities per color, ALWAYS show detailed breakdown in the message
- Include individual calculations like: "Black/White: 48 pieces × $4.50 = $216.00"
- Show subtotals for each color group clearly
- Make the customer feel confident by showing transparent pricing calculations
- Use clear formatting with bullet points or emojis for readability
${imageAnalysisData ? '- Reference the uploaded image analysis in your response to show you understand their visual requirements' : ''}`;

  // Enhanced system prompt for better quantity breakdown handling
  const enhancedSystemPrompt = systemPrompt + `

CRITICAL: When customer asks for quantity breakdown or specifies different quantities per color:
1. ALWAYS show detailed breakdown in the "message" field visible to customer
2. Include individual line items with calculations
3. Use clear formatting: "• Black/White: 48 pieces × $4.50 = $216.00"
4. Show running totals and final total
5. Make customer feel confident with transparent pricing

EXAMPLE MESSAGE FORMAT for breakdown request:
"Here's your detailed quantity breakdown for 576 caps:

📊 **Blank Cap Costs by Color:**
• Black (All Positions): 576 pieces × $2.40 = $1,382.40 
**Subtotal Blank Caps: $1,382.40**

OR for multi-color example:
• Black/White: 48 pieces × $4.50 = $216.00
• Khaki: 144 pieces × $4.25 = $612.00 
• Navy/Khaki: 288 pieces × $3.75 = $1,080.00
**Subtotal Blank Caps: $1,392.20**

🧵 **Premium Fabric (Acrylic):**
• All Colors: 576 pieces × $0.80 = $460.80

🔒 **Premium Closure (Fitted):**
• All Colors: 576 pieces × $0.30 = $172.80

✨ **Customization (All Colors):**
• Large 3D Embroidery Front: 576 pieces × $0.12 = $69.12

🎁 **Accessories:**
• B-Tape Print: 576 pieces × $0.20 = $115.20
• Hang Tag: 576 pieces × $0.30 = $172.80

🚚 **Delivery:**
• Regular Delivery: 576 pieces × $1.90 = $1,094.40

💰 **Total Order: $3,755.52**"

PREMIUM FABRIC CUSTOMER MESSAGE REQUIREMENTS:
When customer mentions premium fabrics, ALWAYS include fabric cost as separate line item in customer message:
- Show premium fabric calculation: "Acrylic Premium Fabric: 288 × $0.80 = $230.40"
- Include fabric cost in total calculation
- Explain that premium fabric is additional to base cap cost

PREMIUM CLOSURE CUSTOMER MESSAGE REQUIREMENTS:
When customer mentions premium closures, ALWAYS include closure cost as separate line item in customer message:
- Show premium closure calculation: "Fitted Premium Closure: 288 × $0.30 = $86.40"
- Include closure cost in total calculation 
- Explain that premium closure replaces default Snapback closure
- Set the closure field correctly: "Closure: Fitted" (NOT "Snapback")

ACCESSORIES CUSTOMER MESSAGE REQUIREMENTS:
When customer specifies accessories (especially from artwork analysis), ALWAYS include accessories cost as separate line items:
- Show each accessory calculation: "B-Tape Print: 576 × $0.20 = $115.20"
- Show each accessory calculation: "Brand Label (Inside Label): 576 × $0.20 = $115.20"
- Show each accessory calculation: "Hang Tag: 576 × $0.30 = $172.80"
- Map ALL label types to Inside Label pricing: Brand Label, Main Label, Size Label = $0.20/pc
- Include total accessories cost in final calculation
- Use section header: "🎁 **Accessories:**" for better visibility

ABSOLUTE CRITICAL RULES FOR JSON RESPONSE:

ARTWORK ANALYSIS RULE (FUNDAMENTAL - READ FIRST):
Each artwork represents ONE SINGLE CAP STYLE with a specific quantity. This is NOT multiple variations or options.

SINGLE COLOR RULE (MOST IMPORTANT):
When artwork analysis shows same color in all positions (e.g., "Black" front, back, bill):
1. This is ONE single color, NOT multiple colors
2. Calculate base cost ONCE: quantity × unit_price (e.g., 576 × $2.40 = $1,382.40)
3. DO NOT multiply by 3 or by number of positions
4. Show in customer message as: "Black (All Positions): 576 pieces × $2.40 = $1,382.40"

When ANY premium fabric is mentioned (Acrylic, Suede Cotton, Air Mesh, etc.):
1. ALWAYS set capDetails.premiumFabric to the fabric name
2. ALWAYS set pricing.premiumFabricCost to the calculated cost (NOT zero!)
3. ALWAYS include premiumFabricBreakdown in detailedBreakdown
4. ALWAYS add premium fabric cost to the message breakdown

When ANY premium closure is mentioned (Fitted, Flexfit, Buckle, Stretched):
1. ALWAYS set capDetails.closure to the premium closure name (NOT "Snapback")
2. ALWAYS set pricing.premiumClosureCost to the calculated cost (NOT zero!)
3. ALWAYS include premiumClosureBreakdown in detailedBreakdown
4. ALWAYS add premium closure cost to the message breakdown
5. NEVER set closure to "Snapback" when premium closure is specified

When ANY accessories are mentioned (B-Tape Print, Brand Label, Main Label, Size Label, Hang Tag Label, etc.):
1. ALWAYS map artwork analysis names to CSV names:
  - Any Label type (Brand Label, Main Label, Size Label, etc.) → Inside Label ($0.20/pc)
  - Hang Tag Label → Hang Tag ($0.30/pc)
  - B-Tape Print → B-Tape Print ($0.20/pc)
2. ALWAYS set pricing.accessoriesCost to the calculated total cost (NOT zero!)
3. ALWAYS include accessoriesBreakdown in detailedBreakdown with each accessory listed separately
4. ALWAYS add accessories cost section to the message breakdown with "🎁 **Accessories:**" header
5. Calculate using CSV pricing: All Labels = $0.20/pc, Hang Tag = $0.30/pc, B-Tape Print = $0.20/pc

STEP-BY-STEP PREMIUM FABRIC PROCESSING:
1. Scan customer message for fabric names: "Acrylic", "Suede Cotton", "Air Mesh", "Camo", etc.
2. If found, treat as premium fabric upgrade (NOT part of product name)
3. Calculate: fabric_cost = quantity × fabric_unit_price
4. Set pricing.premiumFabricCost = fabric_cost 
5. Include in total: total = baseProductCost + premiumFabricCost + logosCost + deliveryCost

STEP-BY-STEP PREMIUM CLOSURE PROCESSING:
1. Scan customer message for closure names: "Fitted", "Flexfit", "Buckle", "Stretched"
2. If found, treat as premium closure upgrade (replaces default Snapback)
3. Calculate: closure_cost = quantity × closure_unit_price
4. Set capDetails.closure = closure_name (e.g., "Fitted")
5. Set pricing.premiumClosureCost = closure_cost
6. Include in total: total = baseProductCost + premiumClosureCost + logosCost + deliveryCost`;

  // Call OpenAI API using GPT-4o Mini for order creation with timeout and retry logic
  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 120000) => {
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
   
   try {
    const response = await fetch(url, {
     ...options,
     signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
   } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
     throw new Error('Request timeout: OpenAI API call exceeded 2 minutes');
    }
    throw error;
   }
  };

  let response;
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
   try {
    response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
     method: 'POST',
     headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
     },
     body: JSON.stringify({
      model: quoteMaster.model, // Using QuoteMaster AI configuration
      messages: [
       { role: 'system', content: enhancedSystemPrompt },
       { role: 'user', content: userPrompt }
      ],
      temperature: quoteMaster.temperature,
      max_tokens: quoteMaster.maxTokens,
      response_format: { type: 'json_object' }
     }),
    }, 120000); // 2-minute timeout
    break; // Success, exit retry loop
   } catch (error) {
    console.error(`OpenAI API attempt ${retryCount + 1} failed:`, error);
    retryCount++;
    
    if (retryCount > maxRetries) {
     console.error('All OpenAI API retry attempts failed');
     throw error;
    }
    
    // Wait before retry (exponential backoff)
    const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
    console.log(`Retrying in ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
   }
  }

  if (!response.ok) {
   const errorText = await response.text();
   console.error('OpenAI API error:', response.status, response.statusText, errorText);
   throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices[0]?.message?.content;

  if (!content) {
   console.error('No response from OpenAI:', aiResponse);
   throw new Error('No response from OpenAI');
  }

  let orderResponse;
  
  // Enhanced JSON parsing with multiple fallback strategies
  const parseWithFallbacks = (jsonString: string) => {
   const fallbackStrategies = [
    // Strategy 1: Direct parse
    () => JSON.parse(jsonString),
    
    // Strategy 2: Clean common JSON issues
    () => {
     let cleanedString = jsonString
      .replace(/^\s*```json\s*/, '') // Remove markdown code blocks
      .replace(/\s*```\s*$/, '')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .trim();
     
     // Fix common truncation issues
     if (!cleanedString.endsWith('}')) {
      const lastBrace = cleanedString.lastIndexOf('}');
      if (lastBrace > -1) {
       cleanedString = cleanedString.substring(0, lastBrace + 1);
      }
     }
     
     return JSON.parse(cleanedString);
    },
    
    // Strategy 3: Extract JSON from text content
    () => {
     const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
     if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
     }
     throw new Error('No JSON found in response');
    },
    
    // Strategy 4: Build minimal valid response from key fields
    () => {
     const messageMatch = jsonString.match(/"message":\s*"([^"]+)"/);
     const quantityMatch = message.match(/\d+/);
     
     return {
      message: messageMatch?.[1] || `I understand you're looking for a quote for ${quantityMatch?.[0] || 'your'} custom caps. Let me help you with detailed pricing.`,
      quoteData: null,
      actions: ["create_detailed_quote", "modify_specs"]
     };
    }
   ];
   
   for (let i = 0; i < fallbackStrategies.length; i++) {
    try {
     const result = fallbackStrategies[i]();
     if (i > 0) {
      console.log(`JSON parsing succeeded using fallback strategy ${i + 1}`);
     }
     return result;
    } catch (error) {
     if (i === fallbackStrategies.length - 1) {
      console.error(`All JSON parsing strategies failed. Original content: ${jsonString.substring(0, 500)}...`);
      throw error;
     }
    }
   }
  };

  try {
   orderResponse = parseWithFallbacks(content);
   
   // 🚨 POST-PROCESSING FIX: Correct AI pricing errors for ALL components
   orderResponse = await correctQuantityBasedPricing(orderResponse, pricingTiers, logoOptions, accessoryOptions, deliveryOptions);
   
   // Validate essential fields
   if (!orderResponse.message) {
    orderResponse.message = "I understand you're looking for a quote. Let me help you with that.";
   }
   
   // Ensure actions array exists
   if (!orderResponse.actions) {
    orderResponse.actions = ["create_detailed_quote", "modify_specs"];
   }
   
  } catch (parseError) {
   console.error('All JSON parsing strategies failed:', parseError);
   
   // Final fallback - create structured response from message analysis
   const extractedQuantity = message.match(/\d+/)?.[0] || 'specified';
   const hasQuantity = extractedQuantity !== 'specified';
   const colorMatch = message.match(/\b(red|blue|black|white|green|yellow|navy|gray|khaki)\b/gi);
   const sizeMatch = message.match(/\b(small|medium|large|xl|xxl|fitted|one size)\b/gi);
   
   orderResponse = {
    message: `I understand you're looking for a quote. Let me help you with that request.

Based on your message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

${hasQuantity ? `I see you mentioned ${extractedQuantity} pieces. ` : ''}${colorMatch ? `You mentioned ${colorMatch.join(', ')} colors. ` : ''}${sizeMatch ? `Size requirements: ${sizeMatch.join(', ')}. ` : ''}

To provide you with accurate pricing, please confirm:
• The exact quantity you need
• Your preferred cap style and colors  
• What type of customization you're looking for (embroidery, patches, etc.)
• Any specific requirements or deadlines

I'll get back to you with precise pricing based on your specifications, including all costs for materials, customization, and delivery.`,
    quoteData: null,
    actions: ["create_detailed_quote", "modify_specs"]
   };
  }

  // If quote data is provided, save it to database
  let userEmail = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
   try {
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user?.email) {
     userEmail = user.email;
    }
   } catch (authError) {
    console.log('Auth failed during quote save');
   }
  }

  if (orderResponse.quoteData) {
   try {
    const quoteId = orderResponse.quoteData.quoteId || `Q-${Date.now()}`;
    
    // Create QuoteOrder instead of simple Quote for better file support
    const quoteOrderId = uuidv4();
    const now = new Date().toISOString();
    const followUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const { data: createdQuoteOrder, error: quoteOrderError } = await supabaseAdmin
      .from('QuoteOrder')
      .insert({
        id: quoteOrderId,
        sessionId: sessionId || `session-${Date.now()}`,
        title: `AI Generated Quote - ${orderResponse.quoteData.capDetails?.productName || 'Custom Cap'}`,
        status: 'IN_PROGRESS',
        customerEmail: userProfile?.email || userEmail,
        customerName: userProfile?.name || 'Unknown',
        customerPhone: userProfile?.phone || '',
        customerCompany: userProfile?.company || '',
        productType: orderResponse.quoteData.capDetails?.productName || 'Custom Cap',
        quantities: orderResponse.quoteData.capDetails?.quantities || {},
        colors: orderResponse.quoteData.capDetails?.colors || {},
        logoRequirements: orderResponse.quoteData.customization?.logos || {},
        customizationOptions: {
          accessories: orderResponse.quoteData.accessories || [],
          moldCharges: orderResponse.quoteData.moldCharges || 0,
          delivery: orderResponse.quoteData.delivery || {}
        },
        estimatedCosts: orderResponse.quoteData.pricing || {},
        aiSummary: orderResponse.message || '',
        additionalRequirements: message || '',
        complexity: 'SIMPLE',
        priority: 'NORMAL',
        followUpRequired: true,
        followUpDate: followUpDate,
        convertedToOrderId: null,
        createdAt: now,
        updatedAt: now
      })
      .select()
      .single();

    if (quoteOrderError) {
      throw new Error(`Failed to create QuoteOrder: ${quoteOrderError.message}`);
    }

    // Save attached files if any
    if (attachedFiles && attachedFiles.length > 0) {
     console.log('💾 Saving attached files to QuoteOrder:', attachedFiles.length, 'files');
     
     for (const fileUrl of attachedFiles) {
      if (fileUrl && typeof fileUrl === 'string') {
       try {
        // Extract file info from Supabase URL
        const fileName = fileUrl.split('/').pop() || 'unknown-file';
        const isLogo = fileUrl.toLowerCase().includes('logo') || 
               fileName.toLowerCase().includes('logo') ||
               (imageAnalysisData?.results?.some((r: any) => r.imageUrl === fileUrl && r.analysis));
        
        const { error: fileError } = await supabaseAdmin
          .from('QuoteOrderFile')
          .insert({
            id: uuidv4(),
            quoteOrderId: createdQuoteOrder.id,
            originalName: fileName,
            fileName: fileName,
            fileType: fileName.includes('.png') ? 'image/png' : 
                     fileName.includes('.jpg') ? 'image/jpeg' :
                     fileName.includes('.webp') ? 'image/webp' : 'image/*',
            fileSize: 0, // We don't have size info from URL
            filePath: fileUrl,
            bucket: 'uploads',
            category: isLogo ? 'LOGO' : 'IMAGE',
            isLogo: isLogo,
            description: isLogo ? 'Logo uploaded for analysis' : 'Image attachment',
            createdAt: now,
            updatedAt: now
          });

        if (fileError) {
          throw new Error(`Failed to create QuoteOrderFile: ${fileError.message}`);
        }
        
        console.log('✅ Saved file to QuoteOrder:', fileName, isLogo ? '(Logo)' : '(Image)');
       } catch (fileError) {
        console.error('❌ Failed to save file:', fileUrl, fileError);
       }
      }
     }
    }

    orderResponse.quoteData.savedToDatabase = true;
    orderResponse.quoteData.quoteOrderId = createdQuoteOrder.id;
    console.log('✅ QuoteOrder created successfully:', createdQuoteOrder.id);
   } catch (dbError) {
    console.error('Failed to save QuoteOrder to database:', dbError);
    console.log('⚠️ Database connectivity issue detected:', dbError.message);
    if (dbError.message.includes("Can't reach database server")) {
      return NextResponse.json(
        { 
          error: 'Database connectivity issue', 
          details: 'Unable to connect to database. Please try again later.',
          fallback: true
        },
        { status: 503 }
      );
    }
    orderResponse.quoteData.savedToDatabase = false;
   }
  }

  // Save conversation messages if conversationId is provided
  if (conversationId) {
   try {
    // Save user message
    await ConversationService.addMessage(conversationId, {
     role: 'user',
     content: message,
     metadata: {
      intent,
      sessionId,
      timestamp: new Date().toISOString()
     }
    });

    // Enhanced assistant response storage - ensure detailed quote content is preserved
    let assistantMessageContent = orderResponse.message || 'Order processing completed';
    
    // CRITICAL FIX: Enhance message content for complete quote preservation
    if (orderResponse.quoteData && orderResponse.quoteData.pricing) {
      console.log('📝 Enhancing assistant message with complete quote details for conversation history');
      
      // Ensure the message includes detailed pricing breakdown for conversation history
      if (!assistantMessageContent.includes('💰 Total Order') && 
          !assistantMessageContent.includes('📊') && 
          assistantMessageContent.length < 500) {
        
        console.log('⚠️ Original AI message appears incomplete, enhancing with quote details');
        
        // Build detailed quote summary for conversation history
        const quote = orderResponse.quoteData;
        const pricing = quote.pricing || {};
        
        const detailedQuoteBreakdown = `${assistantMessageContent}

📊 **Complete Quote Summary:**

**Cap Specifications:**
• Product: ${quote.capDetails?.productName || 'Custom Cap'}
• Quantity: ${pricing.quantity || 'Not specified'} pieces
• Profile: ${quote.capDetails?.profile || 'Not specified'}
• Colors: ${quote.capDetails?.colors?.join(', ') || 'Not specified'}
• Closure: ${quote.capDetails?.closure || 'Not specified'}

**Cost Breakdown:**
• Base Product Cost: $${pricing.baseProductCost?.toFixed(2) || '0.00'}${pricing.premiumFabricCost > 0 ? `
• Premium Fabric Cost: $${pricing.premiumFabricCost.toFixed(2)}` : ''}${pricing.premiumClosureCost > 0 ? `
• Premium Closure Cost: $${pricing.premiumClosureCost.toFixed(2)}` : ''}${pricing.logosCost > 0 ? `
• Customization Cost: $${pricing.logosCost.toFixed(2)}` : ''}${pricing.accessoriesCost > 0 ? `
• Accessories Cost: $${pricing.accessoriesCost.toFixed(2)}` : ''}${pricing.moldChargesCost > 0 ? `
• Mold Charges: $${pricing.moldChargesCost.toFixed(2)}` : ''}
• Delivery Cost: $${pricing.deliveryCost?.toFixed(2) || '0.00'}

💰 **Total Order: $${pricing.total?.toFixed(2) || '0.00'}**

*This detailed quote has been saved to your conversation history and can be referenced using the quote ID provided.*`;

        assistantMessageContent = detailedQuoteBreakdown;
        console.log('✅ Enhanced message content with complete quote details for conversation history');
      }
    }

    // Save assistant response with enhanced LogoCraft Pro integration metadata
    await ConversationService.addMessage(conversationId, {
     role: 'assistant',
     content: assistantMessageContent,
     metadata: {
      model: 'gpt-4o-mini',
      assistant: 'QUOTE_MASTER',
      intent,
      sessionId,
      quoteGenerated: !!orderResponse.quoteData,
      logoAnalysisIntegrated: shouldUseAnalysisData,
      logoAnalysisSource: logoAnalysisSource || null,
      logoCraftProIntegration: shouldUseAnalysisData ? {
       dataSource: logoAnalysisSource,
       hasDetailedAnalysis: !!previousLogoAnalysis?.some((r: any) => r.analysis),
       hasLogoCraftMessage: !!previousLogoAnalysis?.some((r: any) => r.logoAnalysisMessage),
       analysisItemCount: previousLogoAnalysis?.length || 0,
       completedQuote: !!orderResponse.quoteData
      } : null,
      quoteMasterResponse: true,
      completedLogoCraftWorkflow: shouldUseAnalysisData && !!orderResponse.quoteData,
      timestamp: new Date().toISOString(),
      // Additional metadata to help identify detailed quote messages in conversation history
      hasDetailedQuote: !!orderResponse.quoteData,
      quoteOrderId: orderResponse.quoteData?.quoteOrderId || null,
      messageEnhanced: assistantMessageContent !== (orderResponse.message || 'Order processing completed')
     }
    });

    // CRITICAL FIX: Link QuoteOrder to Conversation if quote was created
    if (orderResponse.quoteData?.savedToDatabase && orderResponse.quoteData?.quoteOrderId) {
     try {
      console.log('🔗 Creating ConversationQuotes link:', {
       conversationId,
       quoteOrderId: orderResponse.quoteData.quoteOrderId
      });

      // Create unique ID for the ConversationQuotes record using multiple fallback approaches
      let conversationQuoteId;
      try {
        conversationQuoteId = crypto.randomUUID();
      } catch (cryptoError) {
        console.warn('crypto.randomUUID() failed, using alternative approach:', cryptoError);
        conversationQuoteId = uuidv4();
      }
      
      // Final fallback to manual UUID-like string if both fail
      if (!conversationQuoteId) {
        conversationQuoteId = `cq_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      }
      
      const now = new Date().toISOString();
      
      console.log('🔧 ConversationQuotes insert attempt with ID:', conversationQuoteId);

      const { error: conversationQuotesError } = await supabaseAdmin
        .from('ConversationQuotes')
        .insert({
          id: conversationQuoteId, // Explicitly set the ID to fix null constraint violation
          conversationId: conversationId,
          quoteOrderId: orderResponse.quoteData.quoteOrderId,
          isMainQuote: true,
          createdAt: now,
          updatedAt: now
        });

      if (conversationQuotesError) {
        console.error('❌ ConversationQuotes insert error details:', {
          code: conversationQuotesError.code,
          message: conversationQuotesError.message,
          details: conversationQuotesError.details,
          hint: conversationQuotesError.hint,
          insertedData: {
            id: conversationQuoteId,
            conversationId,
            quoteOrderId: orderResponse.quoteData.quoteOrderId,
            isMainQuote: true
          }
        });
        
        // CRITICAL FIX: Don't fail the entire quote creation process due to this linking issue
        // The quote was successfully created and saved, just the conversation linking failed
        console.warn('⚠️ ConversationQuotes linking failed but quote creation succeeded. Continuing...');
        
        // Mark in metadata that linking failed for debugging
        if (!orderResponse.metadata) orderResponse.metadata = {};
        orderResponse.metadata.conversationQuotesLinkFailed = true;
        orderResponse.metadata.conversationQuotesError = conversationQuotesError.message;
      } else {
        console.log('✅ Successfully linked QuoteOrder to Conversation');
      }

      // Update conversation to mark it has a quote and update activity
      const conversationUpdateTime = new Date().toISOString();
      const { error: conversationUpdateError } = await supabaseAdmin
        .from('Conversation')
        .update({
          hasQuote: true,
          quoteCompletedAt: conversationUpdateTime,
          lastActivity: conversationUpdateTime,
          updatedAt: conversationUpdateTime
        })
        .eq('id', conversationId);

      if (conversationUpdateError) {
        console.error('❌ Failed to update Conversation:', conversationUpdateError);
        // Continue without failing - the quote creation was successful
      }
     } catch (linkError) {
      console.error('❌ Failed to link QuoteOrder to Conversation:', linkError);
      // Continue without failing the request
     }
    }
   } catch (conversationError) {
    console.error('Failed to save conversation messages:', conversationError);
    // Continue without failing the request
   }
  }

  // Format response with QuoteMaster AI identity
  const formattedResponse = formatAssistantResponse(quoteMaster, orderResponse.message);
  
  return NextResponse.json({
   ...orderResponse,
   ...formattedResponse,
   conversationId,
   metadata: {
    ...formattedResponse.metadata,
    intent,
    timestamp: new Date().toISOString(),
    logoAnalysisIntegrated: shouldUseAnalysisData,
    logoAnalysisSource: logoAnalysisSource || null,
    logoCraftProIntegration: shouldUseAnalysisData ? {
     dataSource: logoAnalysisSource,
     hasDetailedAnalysis: !!previousLogoAnalysis?.some((r: any) => r.analysis),
     hasLogoCraftMessage: !!previousLogoAnalysis?.some((r: any) => r.logoAnalysisMessage),
     analysisItemCount: previousLogoAnalysis?.length || 0,
     completedQuote: !!orderResponse.quoteData
    } : null,
    quoteMasterResponse: true,
    completedLogoCraftWorkflow: shouldUseAnalysisData && !!orderResponse.quoteData,
    dataSourcesLoaded: {
     blankCaps: blankCapProducts.length,
     logos: logoOptions.length,
     colors: colorOptions.length,
     sizes: sizeOptions.length,
     accessories: accessoryOptions.length,
     closures: closureOptions.length,
     fabrics: fabricOptions.length,
     delivery: deliveryOptions.length
    }
   }
  });

 } catch (error) {
  console.error('Order creation processing error:', error);
  
  // Get QuoteMaster AI assistant configuration for error response
  const quoteMasterError = AI_ASSISTANTS.QUOTE_MASTER;
  
  return NextResponse.json(
   { 
    message: "I apologize, but I'm having trouble creating your quote right now. Please try rephrasing your request with specific details like quantity, colors, and customization requirements.",
    error: 'Processing failed',
    assistant: {
     id: quoteMasterError.id,
     name: quoteMasterError.name,
     displayName: quoteMasterError.displayName,
     color: quoteMasterError.color,
     colorHex: quoteMasterError.colorHex,
     icon: quoteMasterError.icon,
     specialty: quoteMasterError.specialty
    },
    model: quoteMasterError.model
   },
   { status: 500 }
  );
 }
}