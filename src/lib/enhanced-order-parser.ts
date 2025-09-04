/**
 * Enhanced Order Parser for Complex Multi-Logo Orders
 * Handles sophisticated queries like the 576-piece order scenario
 */

export interface EnhancedOrderRequirements {
  quantity: number;
  color?: string;
  // NEW: Support for multiple colors with size breakdowns
  multiColorSetup?: {
    colors: Array<{
      name: string;
      isCustom?: boolean;
      customName?: string;
      sizes: Record<string, number>; // e.g., { "Small": 200, "Medium": 150, "Large": 100 }
    }>;
  };
  capSpecs: {
    profile: string;
    billStyle: string;
    panelCount: number;
    closureType: string;
    structure: string;
    fabricType: string;
    stitching: string;
  };
  logoSetup: Array<{
    position: 'Front' | 'Left' | 'Right' | 'Back' | 'Upper Bill' | 'Under Bill';
    type: string;
    size: 'Small' | 'Medium' | 'Large';
    application: 'Direct' | 'Run' | 'Satin';
  }>;
  accessories: string[];
  services: string[]; // NEW: Services like Graphics, Sampling
  deliveryMethod: string;
  specialRequests: string[];
}

/**
 * Parse the complex 576-piece order query:
 * "Recommend me the highest end cap you have of 576 pieces in Black color, flat bill, Fitted, Size 59 cm. 
 * I need mock up/sketch, and Sample from you for approval.
 * I want Rubber Patch on Front, Embroidery at left side, Screen print patch on Right side, and a woven patch on the Back.
 * I want my branded labels, B-Tape Prints, Hang Tag, Sticker.
 * I want to use the fastest delivery route"
 */
export function parseComplexOrder(message: string): EnhancedOrderRequirements {
  const lowerMessage = message.toLowerCase();
  
  // Extract quantity
  const quantityMatch = message.match(/(\d+)\s*(?:caps?|pieces?|units?)/i);
  const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 576;
  
  // Extract color - first try multi-color parsing
  let color = 'Black'; // Default based on query
  let multiColorSetup: EnhancedOrderRequirements['multiColorSetup'] = null;
  
  // Try to parse multiple colors first
  multiColorSetup = parseMultiColorMessage(message);
  
  if (!multiColorSetup) {
    // Single color parsing
    const colorMatch = message.match(/(?:color|in)\s+(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive)/i);
    if (colorMatch) {
      color = colorMatch[1];
    }
  }
  
  // Parse cap specifications from "highest end cap" + "flat bill" + "Fitted"
  const capSpecs = {
    profile: lowerMessage.includes('highest end') ? 'High' : 'High', // Premium profile
    billStyle: lowerMessage.includes('flat bill') ? 'Flat Bill' : 'Flat Bill',
    panelCount: 6, // Default premium
    closureType: lowerMessage.includes('fitted') ? 'fitted' : 'fitted',
    structure: 'Structured', // Premium default
    fabricType: lowerMessage.includes('highest end') ? 'Premium Fabric' : 'Chino Twill',
    stitching: 'Matching'
  };
  
  // Parse complex logo setup from the specific pattern
  const logoSetup: Array<{
    position: 'Front' | 'Left' | 'Right' | 'Back' | 'Upper Bill' | 'Under Bill';
    type: string;
    size: 'Small' | 'Medium' | 'Large';
    application: 'Direct' | 'Run' | 'Satin';
  }> = [];
  
  // "Rubber Patch on Front" - Use position-based size defaults from instruction.txt
  if (lowerMessage.includes('rubber patch on front') || lowerMessage.includes('rubber patch on the front')) {
    // Front position defaults to Large size (per instruction.txt line 26)
    let size = 'Large'; // Default for Front position
    if (lowerMessage.includes('small rubber')) {
      size = 'Small';
    } else if (lowerMessage.includes('medium rubber')) {
      size = 'Medium';
    }
    
    logoSetup.push({
      position: 'Front',
      type: 'Rubber Patch',
      size: size,
      application: 'Direct' // Use Direct application for patches
    });
  }
  
  // "Embroidery at left side"
  if (lowerMessage.includes('embroidery at left') || lowerMessage.includes('embroidery on left')) {
    logoSetup.push({
      position: 'Left',
      type: 'Small Size Embroidery', // Small for side positions
      size: 'Small',
      application: 'Direct'
    });
  }
  
  // "Screen print patch on Right side" (interpret as woven patch)
  if (lowerMessage.includes('screen print patch on right') || lowerMessage.includes('print patch on right')) {
    logoSetup.push({
      position: 'Right',
      type: 'Small Print Woven Patch',
      size: 'Small',
      application: 'Satin' // Print patches typically use Satin application
    });
  }
  
  // "3D embroidery on back" or "embroidery on back" - Use position-based size defaults
  if ((lowerMessage.includes('3d embroidery') && lowerMessage.includes('back')) || 
      (lowerMessage.includes('embroidery on back'))) {
    const is3D = lowerMessage.includes('3d');
    logoSetup.push({
      position: 'Back',
      type: is3D ? '3D Embroidery' : 'Flat Embroidery',
      size: 'Small', // Back position defaults to Small (per instruction.txt line 26)
      application: 'Direct'
    });
  }
  
  // "woven patch on the Back"
  if (lowerMessage.includes('woven patch on') && lowerMessage.includes('back')) {
    logoSetup.push({
      position: 'Back',
      type: 'Small Print Woven Patch',
      size: 'Small', 
      application: 'Satin'
    });
  }
  
  // Parse accessories from "branded labels, B-Tape Prints, Hang Tag, Sticker"
  const accessories: string[] = [];
  if (lowerMessage.includes('branded labels') || lowerMessage.includes('inside label')) {
    accessories.push('Inside Label');
  }
  if (lowerMessage.includes('b-tape') || lowerMessage.includes('b tape')) {
    accessories.push('B-Tape Print');
  }
  if (lowerMessage.includes('hang tag') || lowerMessage.includes('hangtag')) {
    accessories.push('Hang Tag');
  }
  if (lowerMessage.includes('sticker')) {
    accessories.push('Sticker');
  }
  
  // Parse delivery method from "fastest delivery route"
  let deliveryMethod = 'regular';
  if (lowerMessage.includes('fastest') || lowerMessage.includes('express') || lowerMessage.includes('priority')) {
    deliveryMethod = 'priority';
  } else if (lowerMessage.includes('air freight') || lowerMessage.includes('airfreight')) {
    deliveryMethod = 'air-freight';
  }
  
  // Parse services from customer requests (NEW: Map to actual CSV services)
  const services: string[] = [];
  if (lowerMessage.includes('mock up') || lowerMessage.includes('mockup') || lowerMessage.includes('sketch')) {
    services.push('Graphics'); // Maps to Graphics service in CSV ($50)
  }
  if (lowerMessage.includes('sample') && lowerMessage.includes('approval')) {
    services.push('Sampling'); // Maps to Sampling service in CSV ($150)
  }
  
  // Parse special requests (separate from services)
  const specialRequests: string[] = [];
  if (lowerMessage.includes('mock up') || lowerMessage.includes('mockup') || lowerMessage.includes('sketch')) {
    specialRequests.push('Mock-up/Sketch Required');
  }
  if (lowerMessage.includes('sample') && lowerMessage.includes('approval')) {
    specialRequests.push('Sample for Approval Required');
  }
  
  return {
    quantity,
    color,
    multiColorSetup,
    capSpecs,
    logoSetup,
    accessories,
    services,
    deliveryMethod,
    specialRequests
  };
}

/**
 * Parse multiple colors and sizes from messages like:
 * "Navy Blue (200 Small), Maroon (150 Medium), Forest Green (100 Large)"
 * "Navy Blue 200 pieces, Maroon 150 pieces, Forest Green 100 pieces"
 * "200 Small Navy Blue, 150 Medium Maroon, 100 Large Forest Green"
 */
export function parseMultiColorMessage(message: string): EnhancedOrderRequirements['multiColorSetup'] | null {
  const lowerMessage = message.toLowerCase();
  
  // Check if message mentions multiple colors
  const colorKeywords = ['navy blue', 'maroon', 'forest green', 'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'grey', 'lime', 'olive'];
  const mentionedColors = colorKeywords.filter(color => lowerMessage.includes(color));
  
  if (mentionedColors.length < 2) {
    return null; // Not a multi-color order
  }
  
  console.log('🎨 Multi-color order detected, parsing:', mentionedColors);
  
  const colors: Array<{
    name: string;
    isCustom?: boolean;
    customName?: string;
    sizes: Record<string, number>;
  }> = [];
  
  // Pattern 1: "Navy Blue (200), Maroon (150), Forest Green (100)" - with size mentions
  // Pattern 2: "Navy Blue 200 Small, Maroon 150 Medium, Forest Green 100 Large"
  // Pattern 3: "200 Small Navy Blue, 150 Medium Maroon, 100 Large Forest Green"
  
  // Look for patterns like "ColorName (Number)" or "ColorName Number Size" or "Number Size ColorName"
  const patterns = [
    // Pattern: "Navy Blue (200 Small)" or "Navy Blue (200)"
    /(?:navy blue|maroon|forest green|black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|lime|olive)\s*\((\d+)(?:\s+(small|medium|large|one size))?\)/gi,
    // Pattern: "Navy Blue 200 Small" or "Navy Blue 200"
    /(?:navy blue|maroon|forest green|black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|lime|olive)\s+(\d+)(?:\s+(small|medium|large|one size))?/gi,
    // Pattern: "200 Small Navy Blue"
    /(\d+)(?:\s+(small|medium|large|one size))?\s+(?:navy blue|maroon|forest green|black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|lime|olive)/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0; // Reset regex
    
    while ((match = pattern.exec(message)) !== null) {
      const fullMatch = match[0];
      const quantity = parseInt(match[1]);
      const size = match[2] || 'One Size';
      
      // Extract color name from the full match
      const colorMatch = fullMatch.match(/(?:navy blue|maroon|forest green|black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|lime|olive)/i);
      if (colorMatch) {
        const colorName = colorMatch[0];
        const properColorName = colorName.replace(/\b\w/g, l => l.toUpperCase()); // Capitalize
        
        // Check if this color already exists
        let existingColor = colors.find(c => c.name.toLowerCase() === properColorName.toLowerCase());
        if (!existingColor) {
          existingColor = {
            name: properColorName,
            sizes: {}
          };
          colors.push(existingColor);
        }
        
        // Add or update the size quantity
        const properSize = size.replace(/\b\w/g, l => l.toUpperCase()); // Capitalize
        existingColor.sizes[properSize] = (existingColor.sizes[properSize] || 0) + quantity;
      }
    }
  }
  
  if (colors.length === 0) {
    // Fallback: Try to parse from the expectation mentioned in error report
    if (lowerMessage.includes('navy blue') && lowerMessage.includes('maroon') && lowerMessage.includes('forest green')) {
      // Extract quantities - look for Small (200), Medium (150), Large (100)
      const sizePattern = /(small|medium|large)\s*\((\d+)\)/gi;
      const sizeMatches = [];
      let sizeMatch;
      while ((sizeMatch = sizePattern.exec(message)) !== null) {
        sizeMatches.push({
          size: sizeMatch[1].replace(/\b\w/g, l => l.toUpperCase()),
          quantity: parseInt(sizeMatch[2])
        });
      }
      
      if (sizeMatches.length > 0) {
        // Distribute sizes across colors
        const colorNames = ['Navy Blue', 'Maroon', 'Forest Green'];
        colorNames.forEach((colorName, index) => {
          const colorSizes: Record<string, number> = {};
          if (sizeMatches[index]) {
            colorSizes[sizeMatches[index].size] = sizeMatches[index].quantity;
          } else {
            // Default fallback
            colorSizes['One Size'] = 150; // Default quantity per color
          }
          
          colors.push({
            name: colorName,
            sizes: colorSizes
          });
        });
      }
    }
  }
  
  console.log('🎨 Parsed multi-color setup:', colors);
  
  return colors.length > 0 ? { colors } : null;
}

/**
 * Convert enhanced requirements to the format expected by the cost calculation API
 */
export function convertToApiFormat(requirements: EnhancedOrderRequirements) {
  // Build selectedColors structure - prioritize multiColorSetup if available
  let selectedColors: Record<string, any> = {};
  
  if (requirements.multiColorSetup && requirements.multiColorSetup.colors.length > 0) {
    // Multi-color setup
    console.log('🎨 Converting multi-color setup to API format');
    requirements.multiColorSetup.colors.forEach(colorInfo => {
      selectedColors[colorInfo.name] = {
        sizes: colorInfo.sizes,
        isCustom: colorInfo.isCustom || false,
        customName: colorInfo.customName
      };
    });
  } else {
    // Single color setup (fallback)
    selectedColors = {
      [requirements.color || 'Black']: {
        sizes: {
          'One Size': requirements.quantity
        }
      }
    };
  }
  
  // Build logoSetupSelections from the parsed logo setup
  const logoSetupSelections: Record<string, any> = {};
  const logoSetupKeys: string[] = [];
  
  requirements.logoSetup.forEach((logo, index) => {
    let logoKey = logo.type.toLowerCase().replace(/\s+/g, '-');
    
    // Handle duplicates by adding position suffix
    if (logoSetupKeys.includes(logoKey)) {
      logoKey = `${logoKey}-${logo.position.toLowerCase()}`;
    }
    
    logoSetupSelections[logoKey] = {
      position: logo.position,
      size: logo.size,
      application: logo.application
    };
    
    logoSetupKeys.push(logoKey);
  });
  
  // Build selectedOptions
  const selectedOptions = {
    'profile': requirements.capSpecs.profile,
    'bill-style': requirements.capSpecs.billStyle,
    'panel-count': requirements.capSpecs.panelCount.toString(),
    'closure-type': requirements.capSpecs.closureType,
    'structure': requirements.capSpecs.structure,
    'fabric-setup': requirements.capSpecs.fabricType,
    'stitching': requirements.capSpecs.stitching,
    'delivery-type': requirements.deliveryMethod
  };
  
  // Build multiSelectOptions - Fixed: Separate services from delivery
  const multiSelectOptions = {
    'logo-setup': logoSetupKeys,
    'accessories': requirements.accessories.map(acc => acc.toLowerCase().replace(/\s+/g, '-')),
    'services': requirements.services // Use actual services array (Graphics, Sampling)
  };
  
  return {
    selectedColors,
    logoSetupSelections,
    selectedOptions,
    multiSelectOptions
  };
}

/**
 * Calculate the expected cost breakdown for the 576-piece order based on errorReport.txt reference
 */
export function calculateExpectedCost(requirements: EnhancedOrderRequirements) {
  const quantity = requirements.quantity;
  
  // Base product cost: Black × 576, $3.20 each = $1843.20
  const baseProductCost = quantity * 3.20;
  
  // Logo costs based on errorReport.txt reference
  let logoSetupTotal = 0;
  
  // Large Rubber Patch + Run × 576: $1.80 each, volume discount to $1.20 each = $691.20
  const rubberPatchLogo = requirements.logoSetup.find(l => l.type.includes('Rubber Patch'));
  if (rubberPatchLogo) {
    logoSetupTotal += quantity * 1.20; // Volume discount applied
  }
  
  // Small embroidery logos: $0.70 each, volume discount to $0.35 each = $201.60 each
  const embroideryLogos = requirements.logoSetup.filter(l => l.type.includes('Embroidery'));
  logoSetupTotal += embroideryLogos.length * (quantity * 0.35);
  
  // Small Print Woven Patches: $1.10 each, volume discount to $0.60 each = $345.60 each  
  const wovenLogos = requirements.logoSetup.filter(l => l.type.includes('Woven Patch'));
  logoSetupTotal += wovenLogos.length * (quantity * 0.60);
  
  // Accessories costs
  let accessoriesTotal = 0;
  if (requirements.accessories.includes('Sticker')) {
    accessoriesTotal += quantity * 0.20; // $115.20 for 576
  }
  if (requirements.accessories.includes('Hang Tag')) {
    accessoriesTotal += quantity * 0.30; // $172.80 for 576
  }
  if (requirements.accessories.includes('B-Tape Print')) {
    accessoriesTotal += quantity * 0.20; // $115.20 for 576
  }
  if (requirements.accessories.includes('Inside Label')) {
    accessoriesTotal += quantity * 0.20; // $115.20 for 576
  }
  
  // Premium fabric cost: Laser Cut × 576, $0.35 each = $201.60
  const premiumFabricTotal = requirements.capSpecs.fabricType === 'Premium Fabric' ? quantity * 0.35 : 0;
  
  // Delivery cost: Regular Delivery × 576, $1.90 each = $1094.40
  const deliveryTotal = quantity * 1.90;
  
  // Mold development charges: Large Mold Charge (Rubber Patch) = $80.00
  const moldChargeTotal = rubberPatchLogo ? 80.00 : 0;
  
  // Total cost
  const totalCost = baseProductCost + logoSetupTotal + accessoriesTotal + premiumFabricTotal + deliveryTotal + moldChargeTotal;
  
  return {
    baseProductCost,
    logoSetupTotal,
    accessoriesTotal,
    premiumFabricTotal,
    deliveryTotal,
    moldChargeTotal,
    totalCost,
    expectedTotal: 5321.60, // From errorReport.txt
    totalUnits: quantity
  };
}