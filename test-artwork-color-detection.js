/**
 * Test script to verify artwork AI color detection with DP World cap image
 * Expected colors: Front Crown = Stone, Back Crown = Black, Bill = Stone, Underbill = Black
 */

const fs = require('fs');
const FormData = require('form-data');

async function testArtworkColorDetection() {
  console.log('🎯 Testing Artwork AI Color Detection with DP World Image');
  console.log('Expected colors:');
  console.log('- Front Crown: Stone');
  console.log('- Back Crown: Black');
  console.log('- Bill: Stone');
  console.log('- Underbill: Black');
  console.log('- Stitching: Matching');
  console.log('');

  try {
    // Check if the image file exists
    const imagePath = 'F:\\Custom Cap - github\\USCC\\test-dp-world-cap.png';
    
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Image file not found at:', imagePath);
      console.log('Please save the DP World image as test-dp-world-cap.png in the project root');
      return;
    }

    // Create form data with the image file
    const form = new FormData();
    const imageBuffer = fs.readFileSync(imagePath);
    
    form.append('artwork', imageBuffer, {
      filename: 'dp-world-cap.png',
      contentType: 'image/png'
    });
    form.append('userId', 'test-user-artwork-analysis');
    form.append('sessionId', `test-session-${Date.now()}`);

    console.log('📤 Uploading image to artwork analysis API...');
    
    const response = await fetch('http://localhost:3000/api/support/artwork-analysis', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API request failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    
    console.log('✅ Artwork analysis completed!');
    console.log('');
    
    // Extract the analysis results
    const analysis = result.analysis;
    const capSpec = analysis.capSpec;
    
    // Display results
    console.log('🎨 EXTRACTED CAP SPECIFICATIONS:');
    console.log('================================');
    console.log(`Shape: ${capSpec.shape}`);
    console.log(`Bill Shape: ${capSpec.billShape}`);
    console.log(`Fabric: ${capSpec.fabric}`);
    console.log(`Closure: ${capSpec.closure}`);
    console.log(`Panel Count: ${capSpec.panelCount}`);
    console.log('');
    
    console.log('🎯 COLOR EXTRACTION RESULTS:');
    console.log('============================');
    console.log(`Front Crown: ${capSpec.frontCrown} ${capSpec.frontCrown === 'Stone' ? '✅' : '❌ Expected: Stone'}`);
    console.log(`Back Crown: ${capSpec.backCrown} ${capSpec.backCrown === 'Black' ? '✅' : '❌ Expected: Black'}`);
    console.log(`Bill: ${capSpec.bill} ${capSpec.bill === 'Stone' ? '✅' : '❌ Expected: Stone'}`);
    console.log(`Underbill: ${capSpec.underbill} ${capSpec.underbill === 'Black' ? '✅' : '❌ Expected: Black'}`);
    console.log(`Stitching: ${capSpec.stitching}`);
    if (capSpec.sandwich) {
      console.log(`Sandwich: ${capSpec.sandwich}`);
    }
    console.log('');
    
    // Check accuracy
    const expectedColors = {
      frontCrown: 'Stone',
      backCrown: 'Black',
      bill: 'Stone',
      underbill: 'Black'
    };
    
    let correctColors = 0;
    let totalColors = 0;
    
    Object.keys(expectedColors).forEach(colorKey => {
      totalColors++;
      if (capSpec[colorKey] === expectedColors[colorKey]) {
        correctColors++;
      }
    });
    
    const accuracy = (correctColors / totalColors * 100).toFixed(1);
    
    console.log('📊 COLOR DETECTION ACCURACY:');
    console.log('============================');
    console.log(`Correct Colors: ${correctColors}/${totalColors}`);
    console.log(`Accuracy: ${accuracy}%`);
    console.log(`AI Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.log('');
    
    // Display assets if found
    if (analysis.assets && analysis.assets.length > 0) {
      console.log('🏷️ DETECTED ASSETS/LOGOS:');
      console.log('=========================');
      analysis.assets.forEach((asset, index) => {
        console.log(`Asset ${index + 1}:`);
        console.log(`  Position: ${asset.position}`);
        console.log(`  Size: ${asset.size.height} x ${asset.size.width}`);
        console.log(`  Application: ${asset.application}`);
        console.log(`  Description: ${asset.description}`);
        console.log('');
      });
    }
    
    // Display accessories if found
    if (analysis.accessories && analysis.accessories.length > 0) {
      console.log('🔧 DETECTED ACCESSORIES:');
      console.log('========================');
      analysis.accessories.forEach((accessory, index) => {
        console.log(`Accessory ${index + 1}:`);
        console.log(`  Type: ${accessory.type}`);
        console.log(`  Details: ${accessory.details}`);
        console.log('');
      });
    }
    
    // Analysis notes
    if (analysis.analysisNotes && analysis.analysisNotes.length > 0) {
      console.log('📝 ANALYSIS NOTES:');
      console.log('==================');
      analysis.analysisNotes.forEach(note => console.log(`• ${note}`));
      console.log('');
    }
    
    // Overall success assessment
    if (accuracy >= 75) {
      console.log('🎉 SUCCESS: Color detection accuracy is good!');
    } else {
      console.log('⚠️ WARNING: Color detection accuracy could be improved');
      console.log('Consider checking:');
      console.log('- Image quality and resolution');
      console.log('- Color contrast in the image');
      console.log('- AI prompt instructions for color extraction');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('Make sure the development server is running: npm run dev');
    }
  }
}

// Run the test
testArtworkColorDetection().catch(console.error);