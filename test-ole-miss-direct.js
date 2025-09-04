const fs = require('fs');
const path = require('path');

// Test the artwork analysis API directly with the Ole Miss image
async function testOleMissAnalysis() {
    console.log('🧪 Testing Ole Miss Artwork Analysis API Directly...\n');
    
    try {
        // Read the Ole Miss image file 
        // Note: Since we're testing with an image that was shared in conversation,
        // we'll simulate the test by calling the API endpoint directly
        
        console.log('📋 Expected Results for Ole Miss Cap:');
        console.log('- 4 Logo Positions: Front Crown (M), Left Side (mascot), Right Side (tree), Back (Ole Miss script)');
        console.log('- 5 Accessories: Main label, Size label, Brand labels (2 types), Hang tag');
        console.log('');
        
        // Test 1: Check if development server is running
        try {
            const healthResponse = await fetch('http://localhost:3000/api/support/artwork-analysis');
            
            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                console.log('✅ Artwork Analysis API is available');
                console.log('📋 API Info:', healthData);
                console.log('');
            } else {
                console.log('❌ Artwork Analysis API not responding correctly');
                return;
            }
        } catch (serverError) {
            console.log('❌ Development server not running or API not accessible');
            console.log('Please ensure: npm run dev is running');
            return;
        }
        
        // Test 2: Simulate analysis request
        console.log('🔍 To test with actual Ole Miss image:');
        console.log('1. Go to http://localhost:3000/support');
        console.log('2. Upload the Ole Miss artwork image');
        console.log('3. Look for the analysis results showing:');
        console.log('   - Assets: X logos (should be 4)');
        console.log('   - Accessories: X items (should be 5)');
        console.log('   - Confidence: X% (should be high with comprehensive detection)');
        console.log('');
        
        // Test 3: Check the AI service directly if we can
        console.log('🤖 Testing AI Analysis Service Configuration...');
        
        const artworkServicePath = path.join(__dirname, 'src', 'lib', 'ai', 'artwork-analysis-service.ts');
        if (fs.existsSync(artworkServicePath)) {
            const serviceContent = fs.readFileSync(artworkServicePath, 'utf8');
            
            // Check for key detection patterns
            const detectionPatterns = [
                /Most caps have 2-6\+ logos/,
                /Most caps have 3-7\+ different accessory types/,
                /COMPREHENSIVE LOGO DETECTION/,
                /COMPREHENSIVE ACCESSORY DETECTION/
            ];
            
            console.log('📋 Detection Configuration Check:');
            detectionPatterns.forEach((pattern, index) => {
                const found = serviceContent.match(pattern);
                console.log(`  ${found ? '✅' : '❌'} Pattern ${index + 1}: ${pattern.source}`);
            });
            
            // Check for status determination logic
            const statusLogic = serviceContent.match(/determineProcessingStatus[\s\S]*?assetsCount >= (\d+) && accessoriesCount >= (\d+)/);
            if (statusLogic) {
                console.log(`  ℹ️ Current success criteria: ${statusLogic[1]}+ logos, ${statusLogic[2]}+ accessories`);
            }
            
        } else {
            console.log('❌ Cannot find artwork analysis service file');
        }
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Test with actual Ole Miss image upload at localhost:3000/support');
        console.log('2. If results are still "1 logos, 1 accessories", the AI prompt execution needs debugging');
        console.log('3. Check browser console for detailed AI response during upload');
        console.log('4. Verify OpenAI API key is working and has vision model access');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testOleMissAnalysis().catch(console.error);