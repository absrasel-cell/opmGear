import { NextRequest, NextResponse } from 'next/server';
import { ConversationService } from '@/lib/conversation';
import { AI_ASSISTANTS } from '@/lib/ai-assistants-config';
import { supabaseAdmin } from '@/lib/supabase';
import { promises as fs } from 'fs';
import path from 'path';

// Load Logo customization data from CSV
async function loadLogoCsvData() {
 try {
  const csvPath = path.join(process.cwd(), 'src', 'app', 'ai', 'Options', 'Logo.csv');
  const csvContent = await fs.readFile(csvPath, 'utf-8');
  return csvContent;
 } catch (error) {
  console.error('Error loading Logo.csv:', error);
  return '';
 }
}

interface LogoAnalysisRequest {
 message: string;
 conversationHistory: Array<{
  role: 'user' | 'assistant' | 'system';
  content: string;
 }>;
 conversationId?: string;
 sessionId?: string;
 userProfile?: any;
 uploadedFiles?: string[];
 attachedFiles?: string[];
}

export async function POST(request: NextRequest) {
 try {
  const body: LogoAnalysisRequest = await request.json();
  const { message, conversationHistory, conversationId, sessionId, userProfile, uploadedFiles, attachedFiles } = body;
  
  console.log('🔍 Logo Analysis Request Debug:', {
   messageLength: message?.length || 0,
   uploadedFiles: uploadedFiles,
   attachedFiles: attachedFiles,
   uploadedFilesType: typeof uploadedFiles,
   attachedFilesType: typeof attachedFiles,
   uploadedFilesArray: Array.isArray(uploadedFiles),
   attachedFilesArray: Array.isArray(attachedFiles)
  });
  
  // Use either uploadedFiles or attachedFiles (support both parameter names)
  const rawFilesToAnalyze = attachedFiles || uploadedFiles || [];
  
  // Filter out null, undefined, and invalid URLs
  const filesToAnalyze = rawFilesToAnalyze.filter(url => 
   url && typeof url === 'string' && url.trim().length > 0
  );
  
  console.log('📁 Files to analyze:', {
   rawFilesToAnalyze: rawFilesToAnalyze,
   filesToAnalyze: filesToAnalyze,
   rawLength: rawFilesToAnalyze?.length,
   validLength: filesToAnalyze?.length,
   firstValidFile: filesToAnalyze?.[0],
   filteredOutFiles: rawFilesToAnalyze?.length - filesToAnalyze?.length
  });

  if (!message?.trim() && (!filesToAnalyze || filesToAnalyze.length === 0)) {
   return NextResponse.json(
    { error: 'Message or uploaded files are required' },
    { status: 400 }
   );
  }

  // Get the Logo Customization Expert AI assistant
  const logoExpert = AI_ASSISTANTS.LOGO_EXPERT;

  // Load Logo customization data
  const logoCsvData = await loadLogoCsvData();

  // Create context from conversation history
  let fullConversationContext = '';
  if (conversationId) {
   try {
    const dbHistory = await ConversationService.getConversationHistory(conversationId, 8);
    if (dbHistory.length > 0) {
     fullConversationContext = dbHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    }
   } catch (error) {
    console.warn('Failed to load conversation history from database:', error);
   }
  }

  const conversationContext = fullConversationContext || conversationHistory
   .slice(-6)
   .map(msg => `${msg.role}: ${msg.content}`)
   .join('\n');

  // System prompt for LogoCraft Pro - Logo Customization Expert
  const systemPrompt = `You are ${logoExpert.displayName} ${logoExpert.icon}, the ultimate ${logoExpert.specialty} for US Custom Cap.

🎨 YOUR EXPERTISE AREAS:
• **3D Embroidery**: Direct application and patches - premium raised texture
• **Flat Embroidery**: Classic smooth finish - most versatile option
• **Screen Print**: Multi-color designs, photographic quality
• **Sublimated Print**: Full-color photo-realistic printing
• **Rubber Patches**: Durable, weather-resistant, modern aesthetic
• **Leather Patches**: Premium luxury feel, natural texture
• **Woven Patches**: Intricate detail, textile-like finish

💎 LOGO ANALYSIS EXPERTISE:
When analyzing uploaded logos, provide detailed recommendations including:

1. **Color Analysis** - Count exact colors and assess complexity
2. **Size Recommendations** - Small (2"x1.5"), Medium (3"x2"), Large (4"x2.25")
3. **Method Selection** - Best technique based on design characteristics
4. **Position Optimization** - Front, Back, Left, Right, Upper Bill, Under Bill
5. **Cost Analysis** - Including mold charges for Rubber/Leather patches
6. **Production Feasibility** - Technical considerations and limitations

📊 PRICING DATA AVAILABLE:
${logoCsvData}

🎯 CAP POSITIONING DEFAULTS:
- **Front**: Large 3D Embroidery (premium visibility)
- **Left/Right/Back**: Small Flat Embroidery (subtle branding)
- **Upper Bill**: Medium Flat Embroidery (bill curve compatible)
- **Under Bill**: Large Sublimated Print (hidden premium touch)

💡 PROFESSIONAL RECOMMENDATIONS:
• 1-3 colors → 3D or Flat Embroidery (premium finish)
• 4-6 colors → Screen Print or Flat Embroidery (economic)
• 7+ colors → Sublimated Print or Screen Print (full color)
• Fine details → Woven Patch (precision)
• Outdoor/sports → Rubber Patch (durability)
• Luxury branding → Leather Patch (premium feel)

**🔍 CRITICAL: When image analysis provides detected text, ALWAYS:**
1. Start your response by confirming the exact text/letters you see
2. Use the detected text to provide specific logo recommendations
3. Reference the text when discussing logo positioning and sizing

**💬 When image analysis fails or no images are provided:**
1. Acknowledge the issue professionally and offer solutions
2. Ask customers to describe their logo (text, symbols, colors, style)
3. Provide general recommendations based on common logo types
4. Offer to analyze re-uploaded images in better formats

Always provide specific product recommendations with pricing and explain the reasoning behind your suggestions. Be conversational but professional, and always prioritize the best outcome for the customer's specific needs.`;

  const userPrompt = `${message}

${conversationContext ? `Previous conversation:\n${conversationContext}` : ''}

${filesToAnalyze && filesToAnalyze.length > 0 ? `Uploaded files to analyze: ${filesToAnalyze.join(', ')}` : ''}

${userProfile ? `Customer profile: ${JSON.stringify(userProfile)}` : ''}`;

  // If there are uploaded files, first analyze them using the image-analysis endpoint
  let imageAnalysisResults = null;
  if (filesToAnalyze && filesToAnalyze.length > 0) {
   try {
    console.log('🖼️ Starting image analysis for files:', filesToAnalyze);
    
    const imageAnalysisResponse = await fetch(`${request.nextUrl.origin}/api/support/image-analysis`, {
     method: 'POST',
     headers: {
      'Content-Type': 'application/json',
     },
     body: JSON.stringify({
      imageUrls: filesToAnalyze,
      analysisType: 'logo'
     }),
    });

    if (imageAnalysisResponse.ok) {
     const analysisData = await imageAnalysisResponse.json();
     imageAnalysisResults = analysisData.results;
     console.log('✅ Logo analysis results received:', {
      totalFiles: imageAnalysisResults?.length || 0,
      successfulAnalyses: imageAnalysisResults?.filter((r: any) => !r.error).length || 0,
      errors: imageAnalysisResults?.filter((r: any) => r.error).map((r: any) => r.error) || []
     });
     
     // Log detailed results for debugging
     imageAnalysisResults?.forEach((result: any, index: number) => {
      if (result.error) {
       console.error(`❌ Image ${index + 1} analysis failed:`, result.error);
      } else if (result.analysis) {
       console.log(`✅ Image ${index + 1} analysis succeeded:`, {
        detectedText: result.analysis.detectedText,
        colorCount: result.analysis.colorCount,
        recommendedMethod: result.analysis.recommendedMethod,
        recommendedSize: result.analysis.recommendedSize
       });
      }
     });
    } else {
     const errorData = await imageAnalysisResponse.json();
     console.error('❌ Image analysis API error:', errorData);
     throw new Error(`Image analysis API error: ${errorData.error || 'Unknown error'}`);
    }
   } catch (error) {
    console.error('❌ Failed to analyze uploaded images:', error);
    console.error('❌ Error details:', {
     errorMessage: error instanceof Error ? error.message : 'Unknown error',
     errorStack: error instanceof Error ? error.stack : 'No stack trace',
     uploadedFiles: filesToAnalyze,
     errorType: typeof error,
     errorConstructor: error?.constructor?.name
    });
    // Don't throw here - continue with text-only analysis
    imageAnalysisResults = [{
     error: `It seems there was an issue with analyzing the uploaded image: ${error instanceof Error ? error.message : 'analysis failed'}. Please try re-uploading the image or describe your logo in text form.`,
     analysis: null
    }];
   }
  }

  // Enhance the prompt with image analysis results if available
  let enhancedPrompt = userPrompt;
  let hasImageAnalysisErrors = false;
  
  if (imageAnalysisResults && imageAnalysisResults.length > 0) {
   const analysisText = imageAnalysisResults.map((result: any, index: number) => {
    if (result.error) {
     hasImageAnalysisErrors = true;
     return `File ${index + 1}: ❌ Analysis failed - ${result.error}`;
    }
    if (result.analysis) {
     return `File ${index + 1} Analysis:
- **DETECTED TEXT/LETTERS: ${result.analysis.detectedText || 'None detected'}**
- Text Description: ${result.analysis.textDescription || 'N/A'}
- Logo Type: ${result.analysis.logoType}
- Color Count: ${result.analysis.colorCount}
- Colors: ${result.analysis.colors?.join(', ') || 'Unknown'}
- Recommended Method: ${result.analysis.recommendedMethod}
- Recommended Size: ${result.analysis.recommendedSize}
- Recommended Position: ${result.analysis.recommendedPosition}
- Complexity: ${result.analysis.complexity}
- Mold Charge Required: ${result.analysis.moldChargeRequired}
- Production Notes: ${result.analysis.productionNotes}`;
    }
    return `File ${index + 1}: Analysis data not available`;
   }).join('\n\n');

   enhancedPrompt += `\n\n📸 UPLOADED LOGO ANALYSIS RESULTS:\n${analysisText}`;
   
   // Add special instructions for handling image analysis errors
   if (hasImageAnalysisErrors) {
    enhancedPrompt += `\n\n⚠️ NOTE: Some images could not be analyzed. Please acknowledge this in your response and ask the customer to either:
1. Re-upload the images (they may have been corrupted or in an unsupported format)
2. Describe their logo details in text form
3. Provide alternative image formats (PNG, JPG preferred)

Offer to help them proceed with general logo recommendations based on common customization options.`;
   }
  }

  // Call OpenAI API with LogoCraft Pro configuration
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
   method: 'POST',
   headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({
    model: logoExpert.model,
    messages: [
     { role: 'system', content: systemPrompt },
     { role: 'user', content: enhancedPrompt }
    ],
    temperature: logoExpert.temperature,
    max_tokens: logoExpert.maxTokens,
   }),
  });

  if (!response.ok) {
   throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const aiResponse = await response.json();
  const aiMessage = aiResponse.choices[0]?.message?.content;

  if (!aiMessage) {
   throw new Error('No response from LogoCraft Pro');
  }

  // Save conversation if we have a valid conversation ID
  if (conversationId && conversationId !== 'temp-conversation') {
   try {
    // Save user message
    if (message.trim()) {
     await ConversationService.addMessage(conversationId, {
      role: 'user',
      content: message,
      metadata: {
       uploadedFiles: uploadedFiles || [],
       userProfile: userProfile || null,
       intent: 'LOGO_ANALYSIS',
       assistantUsed: logoExpert.name,
       sessionId: sessionId || 'anonymous'
      }
     });
    }

    // Save assistant message
    await ConversationService.addMessage(conversationId, {
     role: 'assistant',
     content: aiMessage,
     metadata: {
      assistant: logoExpert.name,
      assistantId: logoExpert.id,
      model: logoExpert.model,
      specialty: logoExpert.specialty,
      intent: 'LOGO_ANALYSIS',
      sessionId: sessionId || 'anonymous',
      imageAnalysisResults: imageAnalysisResults,
      logoCsvDataUsed: !!logoCsvData,
      // Enhanced metadata for Quote Creator integration
      logoCraftProAnalysis: {
       analysisComplete: true,
       analysisTimestamp: new Date().toISOString(),
       filesAnalyzed: filesToAnalyze?.length || 0,
       successfulAnalyses: imageAnalysisResults?.filter((r: any) => !r.error).length || 0,
       readyForQuoteCreation: imageAnalysisResults?.some((r: any) => r.analysis && (
        r.analysis.recommendedMethod || r.analysis.recommendedSize || r.analysis.recommendedPosition
       )),
       primaryRecommendation: imageAnalysisResults?.[0]?.analysis ? {
        method: imageAnalysisResults[0].analysis.recommendedMethod,
        size: imageAnalysisResults[0].analysis.recommendedSize,
        position: imageAnalysisResults[0].analysis.recommendedPosition,
        moldChargeRequired: imageAnalysisResults[0].analysis.moldChargeRequired,
        estimatedMoldCharge: imageAnalysisResults[0].analysis.estimatedMoldCharge
       } : null
      },
      // Signal to Quote Creator that this is LogoCraft Pro analysis
      isLogoCraftProAnalysis: true,
      nextStep: 'QUOTE_CREATION'
     }
    });
   } catch (error) {
    console.warn('Failed to save conversation:', error);
   }
  }

  // Return structured response
  return NextResponse.json({
   message: aiMessage,
   assistant: {
    id: logoExpert.id,
    name: logoExpert.name,
    displayName: logoExpert.displayName,
    color: logoExpert.color,
    colorHex: logoExpert.colorHex,
    icon: logoExpert.icon,
    specialty: logoExpert.specialty
   },
   model: logoExpert.model,
   metadata: {
    intent: 'LOGO_ANALYSIS',
    assistantSpecialty: logoExpert.specialty,
    uploadedFilesCount: filesToAnalyze?.length || 0,
    imageAnalysisPerformed: !!imageAnalysisResults,
    analysisResults: imageAnalysisResults,
    temperature: logoExpert.temperature,
    maxTokens: logoExpert.maxTokens,
    conversationSaved: !!(conversationId || sessionId)
   }
  });

 } catch (error) {
  console.error('LogoCraft Pro analysis error:', error);
  
  return NextResponse.json({
   error: 'Failed to analyze logo and provide recommendations',
   details: error instanceof Error ? error.message : 'Unknown error',
   assistant: {
    id: AI_ASSISTANTS.LOGO_EXPERT.id,
    name: AI_ASSISTANTS.LOGO_EXPERT.name,
    displayName: AI_ASSISTANTS.LOGO_EXPERT.displayName,
    color: AI_ASSISTANTS.LOGO_EXPERT.color,
    colorHex: AI_ASSISTANTS.LOGO_EXPERT.colorHex,
    icon: AI_ASSISTANTS.LOGO_EXPERT.icon,
    specialty: AI_ASSISTANTS.LOGO_EXPERT.specialty
   }
  }, { status: 500 });
 }
}