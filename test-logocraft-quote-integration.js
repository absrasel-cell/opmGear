const fetch = require('node-fetch');

async function testLogoCraftQuoteIntegration() {
  const baseUrl = 'http://localhost:3000'; // Updated to correct port
  
  console.log('🧪 Testing LogoCraft Pro → CapCraft AI Integration');
  console.log('='.repeat(60));
  
  // Step 1: Simulate LogoCraft Pro analysis (this would normally be triggered by file upload)
  console.log('📋 Step 1: Simulating LogoCraft Pro analysis with conversation metadata');
  
  const conversationId = `test-conversation-${Date.now()}`;
  const sessionId = `test-session-${Date.now()}`;
  
  // Step 2: Send follow-up message asking for complete quote
  console.log('📋 Step 2: Sending follow-up request for complete quote');
  
  const quoteRequest = {
    message: "Can you provide a complete quote for 500 khaki 5-panel caps with the logo I just uploaded? I want 3D embroidery in large size on the front.",
    conversationId: conversationId,
    sessionId: sessionId,
    userProfile: {
      id: '3c6b1c5c-38f8-4899-9321-554383fda100',
      email: 'test@example.com',
      name: 'Test User'
    },
    // Simulate that LogoCraft Pro analysis exists in conversation
    conversationMetadata: {
      hasLogoCraftProAnalysis: true,
      logoCraftProAnalysis: {
        detectedText: '',
        colorCount: 2,
        colors: ['#FFFFFF', '#000000'],
        recommendedMethod: '3D Embroidery',
        recommendedSize: 'Large',
        recommendedPosition: 'Front',
        complexity: 'Simple',
        logoAnalysisCompleted: true
      }
    }
  };
  
  try {
    // Test the new AI support API with LogoCraft Pro to CapCraft AI handoff
    console.log('📋 Step 3: Testing AI Support API with LogoCraft Pro → CapCraft AI handoff');
    
    // First, simulate LogoCraft Pro logo analysis
    const logoAnalysisResponse = await fetch(`${baseUrl}/api/ai-support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "I've uploaded my company logo. Please analyze it for custom cap embroidery options.",
        conversationId: conversationId,
        sessionId: sessionId,
        currentAssistant: 'logo-expert',
        uploadedFiles: [
          {
            type: 'image/png',
            url: 'https://example.com/test-logo.png',
            name: 'company-logo.png'
          }
        ]
      })
    });

    if (logoAnalysisResponse.ok) {
      const logoData = await logoAnalysisResponse.json();
      console.log('✅ LogoCraft Pro Analysis Response Status:', logoAnalysisResponse.status);
      console.log('🎨 Assistant:', logoData.assistant?.name || 'Unknown');
      
      // Wait a moment then request quote generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now test the handoff to CapCraft AI for quote generation
      const quoteResponse = await fetch(`${baseUrl}/api/ai-support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Perfect! Now can you create a complete quote for 500 custom caps using this logo analysis?",
          conversationId: conversationId,
          sessionId: sessionId,
          currentAssistant: 'logo-expert' // Should trigger handoff to quote-master
        })
      });
    
      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json();
        console.log('✅ CapCraft AI Response Status:', quoteResponse.status);
        console.log('💎 Assistant:', quoteData.assistant?.name || 'Unknown');
        console.log('📊 Response Data Keys:', Object.keys(quoteData));
        
        // Check for successful handoff
        if (quoteData.handoff) {
          console.log('🔄 AI Handoff Detected:', {
            from: quoteData.handoff.fromAssistant,
            to: quoteData.handoff.toAssistant,
            type: quoteData.handoff.handoffType,
            message: quoteData.handoff.handoffMessage
          });
          console.log('🎉 SUCCESS: AI handoff executed successfully!');
        } else {
          console.log('⚠️ No handoff detected in response');
        }
        
        if (quoteData.message) {
          console.log('📝 CapCraft AI Message Length:', quoteData.message.length);
          console.log('📝 Message Preview:', quoteData.message.substring(0, 200) + '...');
          
          // Check for LogoCraft integration indicators
          const integrationKeywords = [
            'LogoCraft Pro', 'logo analysis', 'embroidery', 
            'customization', 'specifications', 'analysis'
          ];
          
          const foundKeywords = integrationKeywords.filter(keyword => 
            quoteData.message.toLowerCase().includes(keyword.toLowerCase())
          );
          
          console.log('🔍 Integration Keywords Found:', foundKeywords);
          
          if (foundKeywords.length >= 2) {
            console.log('✅ LogoCraft Pro integration detected in CapCraft AI response');
          } else {
            console.log('❓ Unable to confirm LogoCraft Pro integration in response');
          }
        }
        
        // Check for quote data
        if (quoteData.quoteData) {
          console.log('💰 Quote Data Found:', {
            totalCost: quoteData.quoteData.totalCost,
            unitCost: quoteData.quoteData.unitCost,
            hasLogoBreakdown: !!quoteData.quoteData.logoBreakdown
          });
          
          if (quoteData.quoteData.logoBreakdown) {
            console.log('🎨 Logo Integration Success:', quoteData.quoteData.logoBreakdown);
            console.log('🎉 SUCCESS: CapCraft AI used LogoCraft Pro analysis data!');
          }
        }
        
        // Check conversation context
        if (quoteData.context) {
          console.log('🧠 Context Summary:', quoteData.context);
        }
        
      } else {
        console.error('❌ CapCraft AI request failed:', quoteResponse.status);
        const errorText = await quoteResponse.text();
        console.error('Error details:', errorText.substring(0, 300));
      }
      
    } else {
      console.error('❌ LogoCraft Pro analysis failed:', logoAnalysisResponse.status);
      const errorText = await logoAnalysisResponse.text();
      console.error('Error details:', errorText.substring(0, 300));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🧪 Integration Test Complete');
}

testLogoCraftQuoteIntegration();