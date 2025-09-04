const fs = require('fs');
const path = require('path');

// Test the artwork analysis system with the Ole Miss image
async function testArtworkAnalysis() {
    console.log('🧪 Testing Artwork Analysis System...\n');
    
    // Expected results for Ole Miss cap
    const expected = {
        logos: 4, // Front Crown (M), Left Side (mascot), Right Side (tree), Back (Ole Miss script)
        accessories: 5 // Main label, Size label, Brand labels (2 types), Hang tag
    };
    
    try {
        // Read the artwork analysis service
        const artworkServicePath = path.join(__dirname, 'src', 'lib', 'ai', 'artwork-analysis-service.ts');
        
        if (!fs.existsSync(artworkServicePath)) {
            console.log('❌ Artwork analysis service not found at expected path');
            console.log('📂 Looking for artwork analysis files...');
            
            // Search for artwork analysis related files
            const searchPaths = [
                'src/app/support',
                'src/app/ai',
                'src/lib/ai',
                'src/components'
            ];
            
            for (const searchPath of searchPaths) {
                const fullPath = path.join(__dirname, searchPath);
                if (fs.existsSync(fullPath)) {
                    const files = fs.readdirSync(fullPath, { recursive: true });
                    const relevantFiles = files.filter(file => 
                        file.includes('artwork') || 
                        file.includes('analysis') || 
                        file.includes('ai') ||
                        file.includes('support')
                    );
                    
                    if (relevantFiles.length > 0) {
                        console.log(`📁 Found in ${searchPath}:`, relevantFiles);
                    }
                }
            }
        }
        
        // Test the actual support page functionality
        console.log('\n🔍 Testing Support Page Artwork Analysis...');
        
        // Read support page to understand current implementation
        const supportPagePath = path.join(__dirname, 'src', 'app', 'support', 'page.tsx');
        if (fs.existsSync(supportPagePath)) {
            const supportContent = fs.readFileSync(supportPagePath, 'utf8');
            
            // Look for artwork analysis patterns
            const analysisPatterns = [
                /artwork.*analysis/gi,
                /logo.*count/gi,
                /accessories.*count/gi,
                /confidence/gi,
                /detection/gi
            ];
            
            console.log('📋 Analysis Patterns Found:');
            analysisPatterns.forEach((pattern, index) => {
                const matches = supportContent.match(pattern);
                if (matches) {
                    console.log(`  ${index + 1}. ${pattern.source}: ${matches.length} matches`);
                    matches.slice(0, 3).forEach(match => console.log(`     - "${match}"`));
                }
            });
            
            // Look for the current analysis logic
            const analysisFunction = supportContent.match(/formatCapColors[\s\S]*?}/);
            if (analysisFunction) {
                console.log('\n✅ Found formatCapColors function');
            }
            
            // Look for artwork upload handling
            const uploadHandling = supportContent.match(/handleFileUpload[\s\S]*?}/);
            if (uploadHandling) {
                console.log('✅ Found handleFileUpload function');
            }
            
        } else {
            console.log('❌ Support page not found');
        }
        
        console.log('\n📊 Expected vs Current Detection:');
        console.log(`Expected Logos: ${expected.logos}`);
        console.log(`Expected Accessories: ${expected.accessories}`);
        console.log('\n🔄 To test with actual image, we need to:');
        console.log('1. Start the development server');
        console.log('2. Navigate to /support page');
        console.log('3. Upload the Ole Miss artwork image');
        console.log('4. Observe the detection results');
        
    } catch (error) {
        console.error('❌ Error testing artwork analysis:', error.message);
    }
}

// Run the test
testArtworkAnalysis().catch(console.error);