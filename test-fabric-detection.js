// Test fabric detection for the failing case

// Mock the detection patterns
const AI_DETECTION_RULES = {
  FABRIC_PATTERNS: {
    'acrylic': ['acrylic'],
    'suede cotton': ['suede cotton', 'suede'],
    'genuine leather': ['genuine leather', 'leather'],
    'air mesh': ['air mesh', 'mesh'],
    'duck camo': ['duck camo'],
    'camo': ['army camo', 'digital camo', 'bottomland camo', 'camo', 'camouflage'],
    'laser cut': ['laser cut', 'laser'],
    'chino twill': ['chino twill', 'twill'],
    'trucker mesh': ['trucker mesh', 'trucker', 'split', 'mesh back'],
    'black trucker mesh': ['black trucker mesh']
  }
};

function detectFabricFromText(text) {
  const lowerText = text.toLowerCase();
  
  // Test dual fabric detection first
  let dualFabricMatch = null;
  
  // Pattern 3: "Camo/Laser Cut" (slash separated) - but NOT colors like "Red/White"
  const slashMatch = lowerText.match(/([\w\s]+?)\/([\w\s]+?)(?:\s+fabric)?(?:\s*[.,]|$)/i);
  if (slashMatch) {
    const part1 = slashMatch[1].trim();
    const part2 = slashMatch[2].trim();
    
    // Common colors that should NOT be treated as fabric
    const colors = ['red', 'white', 'black', 'blue', 'green', 'yellow', 'orange', 'purple', 'grey', 'gray', 'brown', 'pink', 'navy', 'royal', 'maroon', 'gold', 'charcoal', 'khaki'];
    
    // If both parts are colors, skip this as fabric detection
    if (colors.includes(part1) && colors.includes(part2)) {
      console.log(`🚫 [FABRIC-DETECTION] Skipping color pattern: ${part1}/${part2}`);
      dualFabricMatch = null;
    } else {
      dualFabricMatch = slashMatch;
    }
  }

  if (dualFabricMatch) {
    console.log('Found dual fabric match:', dualFabricMatch);
    return "DualFabric";
  }
  
  // Standard single fabric detection
  for (const [fabric, patterns] of Object.entries(AI_DETECTION_RULES.FABRIC_PATTERNS)) {
    if (patterns.some(pattern => lowerText.includes(pattern))) {
      console.log(`✅ Found fabric: ${fabric} from pattern matching`);
      return fabric === 'chino twill' ? 'Chino Twill' : 
             fabric === 'trucker mesh' ? 'Chino Twill/Trucker Mesh' :
             fabric === 'duck camo' ? 'Duck Camo' :
             fabric === 'black trucker mesh' ? 'Black Trucker Mesh' :
             fabric.split(' ').map(word => 
               word.charAt(0).toUpperCase() + word.slice(1)
             ).join(' ');
    }
  }
  
  console.log('❌ No fabric detected');
  return null;
}

// Test the failing case
console.log('Testing: "create me a quote for 144 piece, Acrylic fabric, Red/White, Large size. which has 3d embroidery on the front."');
const result = detectFabricFromText("create me a quote for 144 piece, Acrylic fabric, Red/White, Large size. which has 3d embroidery on the front.");
console.log('Result:', result);

console.log('\nTesting: "Acrylic fabric"');
const result2 = detectFabricFromText("Acrylic fabric");
console.log('Result:', result2);

console.log('\nTesting: "Red/White"');
const result3 = detectFabricFromText("Red/White");
console.log('Result:', result3);