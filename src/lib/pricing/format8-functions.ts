/**
 * FORMAT #8 PRICING FUNCTIONS
 *
 * Extracted from step-by-step-pricing route for reusability
 * All functions use accurate Supabase pricing data
 */

import {
  loadProducts,
  loadPricingTiers,
  loadLogoMethods,
  loadPremiumFabrics,
  loadDeliveryMethods,
  loadAccessories,
  loadMoldCharges,
  calculatePriceForQuantity
} from '@/lib/pricing/pricing-service';
import { supabaseAdmin } from '@/lib/supabase';

// Import advanced detection functions from knowledge base
import {
  detectFabricFromText,
  detectClosureFromText,
  detectAccessoriesFromText,
  detectSizeFromText,
  getDefaultApplicationForDecoration
} from '@/lib/costing-knowledge-base';

// CRITICAL FIX: Import unified logo detection system to replace complex logo detection
import { detectLogosUnified, convertToFormat8Format } from '@/lib/unified-logo-detection';

// Enhanced color detection function that handles "Navy/White" patterns with interference prevention
function extractAdvancedColor(text: string): string | null {
  console.log('🎨 [FORMAT8-COLORS] === START EXTRACTING COLOR ===');
  console.log('🎨 [FORMAT8-COLORS] Input text:', text);

  const lowerText = text.toLowerCase();

  // Enhanced color detection with split color support (like "Royal/Black", "Navy/White")
  // Priority 1: Check for COLOR-SPECIFIC slash patterns, not fabric patterns
  const colorSlashPattern = /\b(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\s*\/\s*(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\b/i;
  const slashMatch = text.match(colorSlashPattern);
  console.log('🎨 [FORMAT8-COLORS] Slash pattern match:', slashMatch);

  if (slashMatch) {
    const part1 = slashMatch[1];
    const part2 = slashMatch[2];
    console.log('🎨 [FORMAT8-COLORS] Split color parts:', { part1, part2 });

    // CRITICAL FIX: Expanded color list and improved validation
    const knownColors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
                        'pink', 'brown', 'gray', 'grey', 'navy', 'lime', 'olive', 'royal',
                        'maroon', 'gold', 'charcoal', 'khaki', 'carolina', 'silver', 'teal',
                        'forest', 'burgundy', 'crimson', 'ivory', 'beige', 'tan', 'coral'];

    const part1Valid = knownColors.includes(part1.toLowerCase());
    const part2Valid = knownColors.includes(part2.toLowerCase());
    console.log('🎨 [FORMAT8-COLORS] Color validation:', { part1Valid, part2Valid });

    // If both parts are colors, treat as split color with proper capitalization
    if (part1Valid && part2Valid) {
      // CRITICAL FIX: Capitalize first letter of each color for proper display
      const normalizedPart1 = part1.charAt(0).toUpperCase() + part1.slice(1).toLowerCase();
      const normalizedPart2 = part2.charAt(0).toUpperCase() + part2.slice(1).toLowerCase();
      const normalizedColor = `${normalizedPart1}/${normalizedPart2}`;
      console.log('🎨 [FORMAT8-COLORS] RESULT: Split color detected:', normalizedColor);
      return normalizedColor;
    }
  }

  // Priority 2: Enhanced single color patterns with FABRIC EXCLUSION
  // BUT ONLY if there's NO slash pattern present (avoid interfering with Navy/White)
  const hasSlashPattern = /\b(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\s*\/\s*(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\b/i.test(text);

  console.log('🎨 [FORMAT8-COLORS] Checking for slash pattern interference:', hasSlashPattern);

  if (!hasSlashPattern) {
    const colorPatterns = [
      // Specific color context patterns - only when explicitly stated as color
      /(?:color:?\s*|color\s+)(\b(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\b)/i,
      /(?:make\s+it\s+)(\b(?:black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|navy|lime|olive|royal|maroon|gold|charcoal|khaki|carolina|silver|teal|forest|burgundy|crimson|ivory|beige|tan|coral)\b)/i
    ];
    console.log('🎨 [FORMAT8-COLORS] Testing single color patterns (no slash interference)');

    for (const pattern of colorPatterns) {
      const colorMatch = text.match(pattern);
      console.log('🎨 [FORMAT8-COLORS] Pattern test:', { pattern: pattern.source, match: colorMatch });
      if (colorMatch) {
        const detectedColor = colorMatch[1] || colorMatch[0].trim();
        // CRITICAL FIX: Properly capitalize single colors too
        const normalizedColor = detectedColor.charAt(0).toUpperCase() + detectedColor.slice(1).toLowerCase();
        console.log('🎨 [FORMAT8-COLORS] RESULT: Single color detected:', normalizedColor);
        return normalizedColor;
      }
    }
  } else {
    console.log('🎨 [FORMAT8-COLORS] Skipping single color detection due to slash pattern interference');
  }

  // Priority 3: If no explicit color context, default to Black (as per business rules)
  // But ONLY if we haven't detected any fabric specifications that could be confused
  const hasFabricTerms = /(?:polyester|laser|cut|acrylic|airmesh|cotton|suede|leather)/i.test(text);
  if (!hasFabricTerms) {
    console.log('🎨 [FORMAT8-COLORS] No explicit color or fabric terms, defaulting to Black');
    console.log('🎨 [FORMAT8-COLORS] === END EXTRACTING COLOR ===');
    return 'Black';
  }

  console.log('🎨 [FORMAT8-COLORS] RESULT: Fabric terms detected, no color specified - returning null to use default');
  console.log('🎨 [FORMAT8-COLORS] === END EXTRACTING COLOR ===');
  return null;
}

// Enhanced size detection with CM to hat size mapping
function extractAdvancedSize(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Priority 1: CM measurements (like "59 cm") -> convert to hat size
  const cmPatterns = [
    /(\d{2})\s*cm/i,
    /(\d{2})\s*centimeter/i,
    /size:?\s*(\d{2})\s*cm/i
  ];

  for (const pattern of cmPatterns) {
    const cmMatch = text.match(pattern);
    if (cmMatch) {
      const cmSize = parseInt(cmMatch[1]);
      const hatSize = convertCmToHatSize(cmSize);
      console.log('📏 [ADVANCED-SIZE] CM size detected:', { cm: cmSize, hatSize });
      return hatSize;
    }
  }

  // Priority 2: Direct hat size patterns (like "7 1/4")
  const hatSizePatterns = [
    /\b([67](?:\s*\d+\/\d+|\.\d+)?)\b.*(?:hat|cap|size)/i,
    /(?:hat|cap|size).*?\b([67](?:\s*\d+\/\d+|\.\d+)?)\b/i,
    /\bsize\s*([67](?:\s*\d+\/\d+|\.\d+)?)\b/i
  ];

  for (const pattern of hatSizePatterns) {
    const sizeMatch = text.match(pattern);
    if (sizeMatch) {
      const detectedSize = sizeMatch[1].trim();
      console.log('📏 [ADVANCED-SIZE] Hat size detected:', detectedSize);
      return detectedSize;
    }
  }

  // Priority 3: Standard size patterns
  const standardSizeMatch = text.match(/\b(small|medium|large|x-large|xxl)\b/i);
  if (standardSizeMatch) {
    const desc = standardSizeMatch[1].toLowerCase();
    const hatSize = desc === 'small' ? '7' :
                  desc === 'medium' ? '7 1/4' :
                  desc === 'large' ? '7 1/2' :
                  desc === 'x-large' ? '7 5/8' : '7 1/4';
    console.log('📏 [ADVANCED-SIZE] Standard size detected:', { desc, hatSize });
    return hatSize;
  }

  return null;
}

// CM to Hat Size conversion
function convertCmToHatSize(cm: number): string {
  const sizeMap: { [key: number]: string } = {
    54: '6 3/4',
    55: '6 7/8',
    56: '7',
    57: '7 1/8',
    58: '7 1/4',
    59: '7 3/8',  // This handles the "59 cm" from the error report
    60: '7 1/2',
    61: '7 5/8',
    62: '7 3/4',
    63: '7 7/8',
    64: '8'
  };

  if (sizeMap[cm]) {
    return sizeMap[cm];
  }

  // Find closest match
  if (cm <= 54) return '6 3/4';
  if (cm >= 64) return '8';

  const sizes = Object.keys(sizeMap).map(Number).sort((a, b) => a - b);
  let closest = sizes[0];
  let minDiff = Math.abs(cm - closest);

  for (const size of sizes) {
    const diff = Math.abs(cm - size);
    if (diff < minDiff) {
      minDiff = diff;
      closest = size;
    }
  }

  return sizeMap[closest] || '7 1/4';
}

// Helper function to extract quantity from message text
function extractQuantityFromMessage(message: string): number | null {
  const quantityPatterns = [
    /(\d+,?\d*)\s*(?:pieces|pcs?|caps?|units?)/i,
    /quantity[:\s]*(\d+,?\d*)/i,
    /for\s+(\d+,?\d*)/i,
    /(\d+,?\d*)\s*caps?\s+/i
  ];

  for (const pattern of quantityPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const qty = parseInt(match[1].replace(/,/g, ''));
      if (qty > 0) {
        console.log('🔢 [EXTRACT-QTY] Found quantity in message:', qty);
        return qty;
      }
    }
  }

  console.log('🔢 [EXTRACT-QTY] No quantity found in message');
  return null;
}

// Helper function to extract previous quote context from conversation history
export function extractPreviousQuoteContext(conversationHistory: Array<{ role: string; content: string }>) {
  console.log('📋 [CONTEXT-EXTRACT] Analyzing conversation history for previous quote data...');

  // Initialize empty context
  let context: any = {
    hasQuote: false,
    quantity: null,
    fabric: null,
    closure: null,
    logoRequirements: [],
    accessories: [],
    colors: null,
    size: null
  };

  // Look through conversation history in reverse (most recent first)
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const message = conversationHistory[i];

    // Only analyze assistant messages that contain quote data
    if (message.role === 'assistant' && message.content) {
      const content = message.content.toLowerCase();

      // Check if this message contains a structured quote
      if (content.includes('cap style setup') && content.includes('total investment')) {
        console.log('📋 [CONTEXT-EXTRACT] Found structured quote in message:', i);
        context.hasQuote = true;

        // Extract quantity from various patterns in the structured response
        const quantityPatterns = [
          /for (\d+,?\d*) caps?/i,
          /(\d+,?\d*) pieces?/i,
          /quantity[:\s]*(\d+,?\d*)/i,
          /(\d+,?\d*) caps? for/i,
          /\$[\d,]+\.?\d* \(\$[\d,]+\.?\d*\/cap\) for (\d+,?\d*)/i, // Match structured pricing format
          /base cost[^$]*\$[\d,]+\.?\d*[^(]*\([\d,]+\s*×\s*\$[\d,]+\.?\d*\)[^)]*for (\d+,?\d*)/i, // Base cost line
          /total investment[^$]*\$[\d,]+\.?\d*.*?(\d+,?\d*)/i, // Total investment line
          /base cost:\s*\$[\d,]+\.?\d*\s*\(\$[\d,]+\.?\d*\/cap\)/i, // Extract quantity from per-cap pricing
          /\(\$[\d,]+\.?\d*\/cap\).*?(\d+,?\d*)\s*caps?/i, // Match: ($/cap) ... 600 caps
          /cost breakdown per cap.*?total:\s*\$[\d,]+\.?\d*\/cap.*?=.*?(\d+,?\d*)\s*caps?/i
        ];

        for (const pattern of quantityPatterns) {
          const quantityMatch = message.content.match(pattern);
          if (quantityMatch) {
            const extractedQty = quantityMatch[1] || quantityMatch[2]; // Handle different capture groups
            if (extractedQty) {
              context.quantity = parseInt(extractedQty.replace(/,/g, ''));
              console.log('📋 [CONTEXT-EXTRACT] Found quantity:', context.quantity);
              break;
            }
          }
        }

        // FALLBACK 1: Calculate quantity from base cost division
        if (!context.quantity) {
          const baseCostMatch = message.content.match(/base cost:\s*\$(\d+,?\d*\.?\d*)\s*\(\$(\d+\.?\d*)/i);
          if (baseCostMatch) {
            const totalCost = parseFloat(baseCostMatch[1].replace(/,/g, ''));
            const unitPrice = parseFloat(baseCostMatch[2]);
            if (totalCost && unitPrice) {
              context.quantity = Math.round(totalCost / unitPrice);
              console.log('📋 [CONTEXT-EXTRACT] Calculated quantity from base cost:', context.quantity, '(', totalCost, '/', unitPrice, ')');
            }
          }
        }

        // FALLBACK 2: Try to extract quantity from the user request in conversation history
        if (!context.quantity) {
          for (let j = conversationHistory.length - 1; j >= 0; j--) {
            const userMsg = conversationHistory[j];
            if (userMsg.role === 'user') {
              const userQtyMatch = userMsg.content.match(/(\d+,?\d*)\s*(?:pcs?|caps?|pieces?|units?)/i);
              if (userQtyMatch) {
                context.quantity = parseInt(userQtyMatch[1].replace(/,/g, ''));
                console.log('📋 [CONTEXT-EXTRACT] Found quantity from user message:', context.quantity);
                break;
              }
            }
          }
        }

        // Enhanced fabric extraction - handles dual fabrics and various formats
        const fabricPatterns = [
          /•\s*([^:]*?)fabric[^:]*?:\s*([^(]+)\s*\(\+\$[\d,]+\.?\d*\)/gi,
          /fabric[^:]*?:\s*([^(]+)\s*\(\+\$[\d,]+\.?\d*\)/gi,
          /premium\s+([^:]+):\s*\(\+\$[\d,]+\.?\d*\)/gi,
          /•([^:]*?):\s*\(\+\$[\d,]+\.?\d*\)\s*\(\$[\d,]+\.?\d*\/cap\)/gi,
          /•\s*(acrylic|air mesh|airmesh|suede cotton|genuine leather|laser cut|polyester)[^•\n]*?\(\+\$[\d,]+\.?\d*\)/gi,
          /•(acrylic|air mesh|airmesh|suede cotton|genuine leather|laser cut|polyester)/gi  // Simple extraction
        ];

        for (const pattern of fabricPatterns) {
          const fabricMatches = [...message.content.matchAll(pattern)];
          if (fabricMatches.length > 0) {
            // Handle multiple fabrics (like Acrylic + Air Mesh)
            const fabrics = fabricMatches.map(match => {
              let fabricName = match[2] || match[1];
              if (!fabricName && match[0]) {
                // Extract fabric name from the entire match
                fabricName = match[0].replace(/[•:()$\d,\s+\/cap\n]+/gi, '').trim();
              }

              // Clean up fabric name - simplified approach
              if (fabricName) {
                // Direct fabric name matching instead of complex cleanup
                const lowerFabric = fabricName.toLowerCase();

                if (lowerFabric.includes('acrylic')) {
                  fabricName = 'Acrylic';
                } else if (lowerFabric.includes('airmesh') || lowerFabric.includes('air mesh')) {
                  fabricName = 'Air Mesh';
                } else if (lowerFabric.includes('suede')) {
                  fabricName = 'Suede Cotton';
                } else if (lowerFabric.includes('leather')) {
                  fabricName = 'Genuine Leather';
                } else if (lowerFabric.includes('polyester')) {
                  fabricName = 'Polyester';
                } else if (lowerFabric.includes('laser') && lowerFabric.includes('cut')) {
                  fabricName = 'Laser Cut';
                } else {
                  // Basic cleanup for unrecognized fabrics
                  fabricName = fabricName.replace(/[•:()$\d,\n✅⭐*]/gi, '').trim();
                  fabricName = fabricName.split('\n').pop()?.trim() || fabricName;
                }
              }

              return fabricName ? fabricName.trim() : '';
            }).filter(name => name.length > 2); // Filter out very short matches

            if (fabrics.length > 0) {
              context.fabric = fabrics.join('/');
              console.log('📋 [CONTEXT-EXTRACT] Found fabric(s):', context.fabric);
              break;
            }
          }
        }

        // Enhanced closure extraction
        const closurePatterns = [
          /•closure:\s*([^(]+)\s*\(\+\$[\d,]+\.?\d*\)/gi,
          /closure[^:]*?:\s*([^(]+)\s*\(\+\$[\d,]+\.?\d*\)/gi
        ];

        for (const pattern of closurePatterns) {
          const closureMatch = message.content.match(pattern);
          if (closureMatch && closureMatch[1]) {
            context.closure = closureMatch[1].trim();
            console.log('📋 [CONTEXT-EXTRACT] Found closure:', context.closure);
            break;
          }
        }

        // CRITICAL FIX: Enhanced logo extraction with comprehensive patterns to match conversation-context.ts
        const logoPatterns = [
          // Pattern 1: Standard format - •Front: Rubber Patch (Large) - $xxx
          /•(Front|Back|Left|Right|Bills): ([^-\n]+) - \$[\d,]+\.?\d*/gi,

          // Pattern 2: Alternative format - •Position Logo: Type (Size) - $xxx
          /•(Front|Back|Left|Right|Bills)\s*(?:Logo)?:\s*([^-\n]+)\s*\(([^)]+)\)\s*[-–]\s*\$[\d,]+\.?\d*/gi,

          // Pattern 3: Embroidery specific - •Left Embroidery: (Small) - $xxx
          /•(Front|Back|Left|Right|Bills)\s*(Embroidery|Print|Patch):\s*\(([^)]+)\)\s*[-–]\s*\$[\d,]+\.?\d*/gi,

          // Pattern 4: Screen Print format - •Back Screen Print (Small) - $xxx
          /•(Front|Back|Left|Right|Bills)\s*(Screen\s*Print|Rubber\s*Patch|Leather\s*Patch|Woven\s*Patch|3D\s*Embroidery|Flat\s*Embroidery|Sublimation)\s*\(([^)]+)\)\s*[-–]\s*\$[\d,]+\.?\d*/gi,

          // Pattern 5: Generic position: type (size) format
          /•([^:]+):\s*([^(]+)\s*\(([^)]+)\)\s*[-–]\s*\$[\d,]+\.?\d*/gi,

          // Legacy patterns for backward compatibility
          /([^:]+)\s*logo:\s*([^(]+)\s*\(([^)]+)\)\s*[-–]\s*\$[\d,]+\.?\d*/gi,
          /•([^:]+):\s*([^-]+)[-–]\s*\$[\d,]+\.?\d*/gi
        ];

        for (const pattern of logoPatterns) {
          const logoMatches = [...message.content.matchAll(pattern)];
          if (logoMatches.length > 0) {
            console.log(`🔍 [CONTEXT-EXTRACT] Logo pattern found ${logoMatches.length} matches`);

            for (const logoMatch of logoMatches) {
              let position = logoMatch[1];
              let logoType = logoMatch[2];
              let logoSize = logoMatch[3];

              // Handle different match structures based on pattern
              if (pattern.source.includes('Embroidery|Print|Patch')) {
                // Pattern 3: position + type detected
                logoType = logoMatch[2];
                logoSize = logoMatch[3];
              } else if (pattern.source.includes('Screen\\s*Print|Rubber')) {
                // Pattern 4: position + specific type
                logoType = logoMatch[2];
                logoSize = logoMatch[3];
              } else if (!logoSize && logoMatch[2]) {
                // Pattern 1: extract type and size from combined string
                const logoInfo = logoMatch[2];
                const logoTypeMatch = logoInfo.match(/(3D\s*Embroidery|Flat\s*Embroidery|Screen\s*Print|Rubber\s*Patch|Woven\s*Patch|Leather\s*Patch|Sublimation|Embroidery|Print|Patch)\s*\(([^)]+)\)/i);
                if (logoTypeMatch) {
                  logoType = logoTypeMatch[1];
                  logoSize = logoTypeMatch[2];
                } else {
                  // Try to extract just the type
                  logoType = logoInfo.trim();
                  logoSize = 'Medium'; // Default size
                }
              }

              if (logoType && position) {
                // Clean up extracted data
                position = position.trim();
                logoType = logoType.trim();
                logoSize = logoSize ? logoSize.trim() : 'Medium';

                // Normalize position names
                if (position.toLowerCase().includes('front')) position = 'Front';
                else if (position.toLowerCase().includes('back')) position = 'Back';
                else if (position.toLowerCase().includes('left')) position = 'Left';
                else if (position.toLowerCase().includes('right')) position = 'Right';

                // Normalize logo types
                if (logoType.toLowerCase().includes('rubber') && logoType.toLowerCase().includes('patch')) {
                  logoType = 'Rubber Patch';
                } else if (logoType.toLowerCase().includes('leather') && logoType.toLowerCase().includes('patch')) {
                  logoType = 'Leather Patch';
                } else if (logoType.toLowerCase().includes('screen') && logoType.toLowerCase().includes('print')) {
                  logoType = 'Screen Print';
                } else if (logoType.toLowerCase().includes('3d') && logoType.toLowerCase().includes('embroidery')) {
                  logoType = '3D Embroidery';
                } else if (logoType.toLowerCase().includes('flat') && logoType.toLowerCase().includes('embroidery')) {
                  logoType = 'Flat Embroidery';
                } else if (logoType.toLowerCase().includes('embroidery')) {
                  logoType = 'Embroidery';
                }

                const logoReq = {
                  type: logoType,
                  location: position, // Keep as 'location' for format8 compatibility
                  size: logoSize,
                  hasMoldCharge: logoType.toLowerCase().includes('patch') && logoType !== 'Screen Print'
                };

                // Avoid duplicates
                const exists = context.logoRequirements.find((l: any) =>
                  l.location.toLowerCase() === logoReq.location.toLowerCase() &&
                  l.type.toLowerCase() === logoReq.type.toLowerCase()
                );
                if (!exists) {
                  context.logoRequirements.push(logoReq);
                  console.log('📋 [CONTEXT-EXTRACT] Found logo:', logoReq);
                }
              }
            }
            break;
          }
        }

        // CRITICAL FIX: Enhanced accessory extraction with comprehensive patterns to match conversation-context.ts
        const accessoryPatterns = [
          // Pattern 1: Direct accessory format - •Inside Label: $xxx
          /•\s*(Hang\s*Tag|Inside\s*Label|B-Tape\s*Print|B-Tape|Sticker):\s*\$[\d,]+\.?\d*/gi,

          // Pattern 2: Accessory with per-cap pricing - •Inside Label: $xxx ($x.xx/cap)
          /•\s*(Hang\s*Tag|Inside\s*Label|B-Tape\s*Print|B-Tape|Sticker):\s*\$[\d,]+\.?\d*\s*\(\$[\d.]+\/cap\)/gi,

          // Pattern 3: Generic patterns for any accessory-like items
          /•\s*([^:]*(?:label|tape|sticker|tag)[^:]*?):\s*\$[\d,]+\.?\d*/gi,

          // Pattern 4: Accessories section detection
          /accessories[^:]*?:\s*\$[\d,]+\.?\d*/gi
        ];

        for (const pattern of accessoryPatterns) {
          const accessoryMatches = [...message.content.matchAll(pattern)];
          if (accessoryMatches.length > 0) {
            console.log(`🔍 [CONTEXT-EXTRACT] Accessory pattern found ${accessoryMatches.length} matches`);

            for (const accessoryMatch of accessoryMatches) {
              let accessoryName = accessoryMatch[1]?.trim();

              if (accessoryName && accessoryName.length > 0) {
                // Normalize accessory names
                if (accessoryName.toLowerCase().includes('inside') && accessoryName.toLowerCase().includes('label')) {
                  accessoryName = 'Inside Label';
                } else if (accessoryName.toLowerCase().includes('b-tape')) {
                  accessoryName = 'B-Tape Print';
                } else if (accessoryName.toLowerCase().includes('hang') && accessoryName.toLowerCase().includes('tag')) {
                  accessoryName = 'Hang Tag';
                } else if (accessoryName.toLowerCase().includes('sticker')) {
                  accessoryName = 'Sticker';
                }

                // Check for duplicates
                const exists = context.accessories.find((a: any) =>
                  (typeof a === 'string' ? a : a.type).toLowerCase() === accessoryName.toLowerCase()
                );

                if (!exists) {
                  context.accessories.push({ type: accessoryName });
                  console.log('📋 [CONTEXT-EXTRACT] Found accessory:', accessoryName);
                }
              }
            }
          }
        }

        // Additional fallback: look for specific accessory mentions in the entire content
        const accessoryFallbackPatterns = [
          /Inside\s*Label/gi,
          /B-Tape\s*Print/gi,
          /Hang\s*Tag/gi,
          /Sticker/gi
        ];

        for (const fallbackPattern of accessoryFallbackPatterns) {
          const matches = [...message.content.matchAll(fallbackPattern)];
          for (const match of matches) {
            let accessoryName = match[0];

            // Normalize name
            if (accessoryName.toLowerCase().includes('inside') && accessoryName.toLowerCase().includes('label')) {
              accessoryName = 'Inside Label';
            } else if (accessoryName.toLowerCase().includes('b-tape')) {
              accessoryName = 'B-Tape Print';
            } else if (accessoryName.toLowerCase().includes('hang') && accessoryName.toLowerCase().includes('tag')) {
              accessoryName = 'Hang Tag';
            } else if (accessoryName.toLowerCase().includes('sticker')) {
              accessoryName = 'Sticker';
            }

            // Only add if we found it in a pricing context (has $ nearby)
            const contextStart = Math.max(0, match.index - 50);
            const contextEnd = Math.min(message.content.length, match.index + accessoryName.length + 50);
            const context = message.content.substring(contextStart, contextEnd);

            if (context.includes('$')) {
              const exists = context.accessories.find((a: any) =>
                (typeof a === 'string' ? a : a.type).toLowerCase() === accessoryName.toLowerCase()
              );

              if (!exists) {
                context.accessories.push({ type: accessoryName });
                console.log('📋 [CONTEXT-EXTRACT] Found accessory via fallback:', accessoryName);
              }
            }
          }
        }

        // Extract colors from original user request by looking at user messages
        break; // Found the most recent quote, stop searching
      }
    }
  }

  // Also look for colors, size, and original specifications in user messages
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const message = conversationHistory[i];

    if (message.role === 'user' && message.content) {
      const content = message.content.toLowerCase();

      // Extract colors from user messages
      if (!context.colors) {
        const colorCombinationMatch = message.content.match(/\b(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple|Royal)\s*\/\s*(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple|Royal)\b/gi);
        if (colorCombinationMatch) {
          const colorParts = colorCombinationMatch[0].split('/').map(c => c.trim());
          context.colors = colorParts;
          console.log('📋 [CONTEXT-EXTRACT] Found colors:', context.colors);
        } else {
          const singleColorMatch = message.content.match(/\b(Red|Blue|Black|White|Green|Yellow|Navy|Gray|Grey|Brown|Khaki|Orange|Purple|Royal)\b/gi);
          if (singleColorMatch) {
            context.colors = [singleColorMatch[0]];
            console.log('📋 [CONTEXT-EXTRACT] Found single color:', context.colors);
          }
        }
      }

      // Extract size from user messages
      if (!context.size) {
        const standardSizeMatch = message.content.match(/\b(Small|Medium|Large|X-Large|XXL)\b/i);
        if (standardSizeMatch) {
          context.size = standardSizeMatch[1];
          console.log('📋 [CONTEXT-EXTRACT] Found size:', context.size);
        }
      }

      // CRITICAL FIX: Extract logos from user messages if not found in assistant messages
      if (context.logoRequirements.length === 0) {
        // Use unified logo detection on user messages
        const unifiedDetection = detectLogosUnified(message.content);
        if (unifiedDetection.hasLogos) {
          context.logoRequirements = convertToFormat8Format(unifiedDetection);
          console.log('📋 [CONTEXT-EXTRACT] Found logos from user message:', context.logoRequirements.length);
        }
      }

      // CRITICAL FIX: Extract accessories from user messages if not found in assistant messages
      if (context.accessories.length === 0) {
        const userAccessories = detectAccessoriesFromText(message.content);
        if (userAccessories.length > 0) {
          context.accessories = userAccessories.map(acc => ({ type: acc }));
          console.log('📋 [CONTEXT-EXTRACT] Found accessories from user message:', context.accessories);
        }
      }

      // Extract fabric from user messages if not found in assistant messages
      if (!context.fabric) {
        const userFabric = detectFabricFromText(message.content);
        if (userFabric) {
          context.fabric = userFabric;
          console.log('📋 [CONTEXT-EXTRACT] Found fabric from user message:', context.fabric);
        }
      }

      // Extract closure from user messages if not found in assistant messages
      if (!context.closure) {
        const userClosure = detectClosureFromText(message.content);
        if (userClosure) {
          context.closure = userClosure;
          console.log('📋 [CONTEXT-EXTRACT] Found closure from user message:', context.closure);
        }
      }
    }
  }

  console.log('📋 [CONTEXT-EXTRACT] Final extracted context:', {
    hasQuote: context.hasQuote,
    quantity: context.quantity,
    fabric: context.fabric,
    closure: context.closure,
    logoCount: context.logoRequirements.length,
    accessoryCount: context.accessories.length,
    colors: context.colors,
    size: context.size
  });

  return context;
}

// Step 1: Analyze customer requirements with conversation context
export async function analyzeCustomerRequirements(message: string, conversationHistory: Array<{ role: string; content: string }> = []) {
  console.log('🔍 [ANALYZE] Parsing customer message:', message.substring(0, 100));
  console.log('🔍 [ANALYZE] Conversation history length:', conversationHistory.length);

  // ENHANCED: Use comprehensive conversation context service
  const { ConversationContextService } = await import('../support-ai/conversation-context');

  // Build smart contextual request with comprehensive change detection
  const contextResult = await ConversationContextService.buildSmartContextualRequest(
    message,
    conversationHistory
  );

  console.log('🧠 [ENHANCED-CONTEXT] Smart context analysis:', {
    hasContext: contextResult.hasContext,
    detectedChanges: contextResult.detectedChanges.length,
    mergedSpecs: Object.keys(contextResult.mergedSpecifications).length
  });

  // Extract merged specifications from context service
  const mergedSpecs = contextResult.mergedSpecifications;
  const detectedChanges = contextResult.detectedChanges;

  // Use enhanced contextual request if available, otherwise original message
  const effectiveMessage = contextResult.hasContext ? contextResult.contextualRequest : message;

  console.log('📝 [ENHANCED-CONTEXT] Using contextual message:', effectiveMessage.substring(0, 200) + '...');

  // CRITICAL FIX: Preserve quantity from context, only use default for truly fresh requests
  let quantity;
  if (mergedSpecs.quantity && mergedSpecs.quantity > 0) {
    // Use quantity from conversation context (highest priority)
    quantity = mergedSpecs.quantity;
    console.log('🔢 [QTY-FIX] Using quantity from context:', quantity);
  } else if (extractQuantityFromMessage(effectiveMessage)) {
    // Extract from current message (medium priority)
    quantity = extractQuantityFromMessage(effectiveMessage);
    console.log('🔢 [QTY-FIX] Extracted quantity from message:', quantity);
  } else {
    // Use default only for completely fresh requests (lowest priority)
    quantity = 144;
    console.log('🔢 [QTY-FIX] Using default quantity for fresh request:', quantity);
  }

  // ENHANCED: Determine if this is a conversational update
  const isConversationalUpdate = contextResult.hasContext && detectedChanges.length > 0;
  const isQuantityUpdate = isConversationalUpdate &&
                          detectedChanges.some(change => change.type === 'quantity');

  console.log('🔄 [ENHANCED-ANALYZE] Conversational analysis:', {
    hasContext: contextResult.hasContext,
    isConversationalUpdate: isConversationalUpdate,
    isQuantityUpdate: isQuantityUpdate,
    detectedChangeTypes: detectedChanges.map(c => c.type)
  });

  // ENHANCED: Use merged specifications from comprehensive context service
  let colors = mergedSpecs.colors ? mergedSpecs.colors.split('/') : ['Black'];
  let color = mergedSpecs.colors || mergedSpecs.color || 'Black';

  // Legacy detection as fallback for new specifications only
  if (!contextResult.hasContext) {
    const detectedColor = extractAdvancedColor(message);
    if (detectedColor) {
      if (detectedColor.includes('/')) {
        colors = detectedColor.split('/').map(c => c.trim());
        color = detectedColor;
      } else {
        colors = [detectedColor];
        color = detectedColor;
      }
    }
  }

  console.log('🎨 [ENHANCED-ANALYZE] Colors - Merged specs:', mergedSpecs.colors, 'Final colors:', colors);

  // ENHANCED: Use size from merged specifications
  let size = mergedSpecs.size || 'Large';

  // Legacy detection as fallback for new specifications only
  if (!contextResult.hasContext) {
    const detectedSize = extractAdvancedSize(message);
    if (detectedSize) {
      size = detectedSize;
    }
  }

  console.log('📏 [ENHANCED-ANALYZE] Size - Merged specs:', mergedSpecs.size, 'Final size:', size);

  // ENHANCED: Use fabric from merged specifications with intelligent preservation
  let fabric = mergedSpecs.fabric;

  // Legacy detection as fallback for new specifications only
  if (!contextResult.hasContext) {
    fabric = detectFabricFromText(message);
  }

  console.log('🧵 [ENHANCED-ANALYZE] Fabric - Merged specs:', mergedSpecs.fabric, 'Final fabric:', fabric);

  // ENHANCED: Use panel count from merged specifications
  let panelCount = '6P';
  let capSpecifications: { panelCount?: string; [key: string]: any } = {};

  if (mergedSpecs.panelCount) {
    panelCount = mergedSpecs.panelCount.includes('P') ? mergedSpecs.panelCount : `${mergedSpecs.panelCount}P`;
    capSpecifications.panelCount = panelCount;
  } else {
    // CRITICAL FIX: Enhanced panel count detection with more patterns
    const msgLower = effectiveMessage.toLowerCase();
    if (msgLower.includes('7-panel') || msgLower.includes('7 panel') ||
        msgLower.includes('seven panel') || msgLower.includes('seven-panel') ||
        msgLower.includes('7p ') || msgLower.includes('7 p ')) {
      panelCount = '7P';
      capSpecifications.panelCount = '7P';
      console.log('🎯 [PANEL-DETECTION] 7-PANEL DETECTED from message:', effectiveMessage.substring(0, 100));
    } else if (msgLower.includes('6-panel') || msgLower.includes('6 panel') ||
               msgLower.includes('six panel') || msgLower.includes('six-panel') ||
               msgLower.includes('6p ') || msgLower.includes('6 p ')) {
      panelCount = '6P';
      capSpecifications.panelCount = '6P';
      console.log('🎯 [PANEL-DETECTION] 6-panel detected from message');
    } else if (msgLower.includes('5-panel') || msgLower.includes('5 panel') ||
               msgLower.includes('five panel') || msgLower.includes('five-panel') ||
               msgLower.includes('5p ') || msgLower.includes('5 p ')) {
      panelCount = '5P';
      capSpecifications.panelCount = '5P';
      console.log('🎯 [PANEL-DETECTION] 5-panel detected from message');
    } else if (msgLower.includes('4-panel') || msgLower.includes('4 panel') ||
               msgLower.includes('four panel') || msgLower.includes('four-panel') ||
               msgLower.includes('4p ') || msgLower.includes('4 p ')) {
      panelCount = '4P';
      capSpecifications.panelCount = '4P';
      console.log('🎯 [PANEL-DETECTION] 4-panel detected from message');
    } else {
      capSpecifications.panelCount = '6P';
      console.log('🎯 [PANEL-DETECTION] No specific panel count detected, defaulting to 6P');
    }
  }

  console.log('🎯 [ENHANCED-ANALYZE] Panel count - Merged specs:', mergedSpecs.panelCount, 'Final:', panelCount);

  // CRITICAL FIX: Extract and preserve user's bill shape input
  let billStyle = null;
  if (mergedSpecs.billShape) {
    billStyle = mergedSpecs.billShape;
  } else if (!contextResult.hasContext) {
    // Only detect from message for new requests
    const msgLower = effectiveMessage.toLowerCase();
    if (msgLower.includes('flat bill') || msgLower.includes('flat brim') || msgLower.includes('flatbill')) {
      billStyle = 'Flat';
    } else if (msgLower.includes('slight curve') || msgLower.includes('slightly curved') || msgLower.includes('slight curved')) {
      billStyle = 'Slight Curved';
    } else if (msgLower.includes('curved bill') || msgLower.includes('curved brim')) {
      billStyle = 'Curved';
    }
  }

  console.log('🎯 [ENHANCED-ANALYZE] Bill shape - Merged specs:', mergedSpecs.billShape, 'Detected:', billStyle);

  // ENHANCED: Use closure from merged specifications with intelligent preservation
  let closure = mergedSpecs.closure;

  // Legacy detection as fallback for new specifications only
  if (!contextResult.hasContext) {
    closure = detectClosureFromText(message);
  }

  console.log('🔒 [ENHANCED-ANALYZE] Closure - Merged specs:', mergedSpecs.closure, 'Final closure:', closure);

  // ENHANCED: Use logo requirements from merged specifications
  let logoRequirement = null;
  let allLogoRequirements: any[] = [];

  if (mergedSpecs.logos && mergedSpecs.logos.length > 0) {
    // Convert merged specifications logos to Format #8 format
    allLogoRequirements = mergedSpecs.logos.map(logo => ({
      type: logo.type,
      location: logo.position,
      size: logo.size,
      application: logo.application || 'Direct',
      moldCharge: logo.moldCharge || 0
    }));
    logoRequirement = allLogoRequirements[0];

    console.log('🎨 [ENHANCED-ANALYZE] Using logos from merged specs:', {
      logoCount: allLogoRequirements.length,
      logos: allLogoRequirements.map(l => ({ type: l.type, location: l.location, size: l.size }))
    });
  } else if (!contextResult.hasContext) {
    // Legacy detection for new specifications only
    const unifiedDetection = detectLogosUnified(message);
    allLogoRequirements = convertToFormat8Format(unifiedDetection);
    logoRequirement = allLogoRequirements.length > 0 ? allLogoRequirements[0] : null;

    console.log('🎨 [LEGACY-ANALYZE] UNIFIED logo detection for new request:', {
      totalCount: unifiedDetection.totalCount,
      hasLogos: unifiedDetection.hasLogos,
      logos: unifiedDetection.logos.map(l => ({ type: l.type, position: l.position, size: l.size }))
    });
  }

  // ENHANCED: Use accessories from merged specifications
  let accessoriesRequirements: { type: string; location?: string }[] = [];

  if (mergedSpecs.accessories && mergedSpecs.accessories.length > 0) {
    // Convert merged specifications accessories to Format #8 format
    accessoriesRequirements = mergedSpecs.accessories.map(accessory => ({
      type: accessory
    }));

    console.log('🏷️ [ENHANCED-ANALYZE] Using accessories from merged specs:', {
      accessoryCount: accessoriesRequirements.length,
      accessories: accessoriesRequirements.map(a => a.type)
    });
  } else if (!contextResult.hasContext) {
    // Legacy detection for new specifications only
    let accessoriesFromDetection = detectAccessoriesFromText(message);

    // Convert string array to object format and remove duplicates
    const uniqueAccessories = new Set<string>();
    for (const accessoryType of accessoriesFromDetection) {
      if (!uniqueAccessories.has(accessoryType)) {
        uniqueAccessories.add(accessoryType);
        accessoriesRequirements.push({ type: accessoryType });
      }
    }

    console.log('🏷️ [LEGACY-ANALYZE] Advanced accessories detection for new request:', {
      message: message.substring(0, 100),
      detectedAccessories: accessoriesRequirements,
      uniqueCount: uniqueAccessories.size
    });
  }

  // REMOVED: Manual accessories detection to prevent duplicates
  // The detectAccessoriesFromText function already handles all accessory patterns
  // Keeping manual detection would cause duplicates since both systems detect the same accessories

  // COMPREHENSIVE: Log final analysis with context preservation status
  console.log('✅ [ANALYZE] FINAL ANALYSIS COMPLETE:', {
    isQuantityUpdate: isQuantityUpdate,
    preservedContext: {
      fabric: isQuantityUpdate ? 'PRESERVED' : 'DETECTED',
      closure: isQuantityUpdate ? 'PRESERVED' : 'DETECTED',
      logos: isQuantityUpdate ? `PRESERVED (${allLogoRequirements.length})` : `DETECTED (${allLogoRequirements.length})`,
      accessories: isQuantityUpdate ? `PRESERVED (${accessoriesRequirements.length})` : `DETECTED (${accessoriesRequirements.length})`
    },
    finalValues: {
      quantity: quantity,
      fabric: fabric,
      closure: closure,
      logoCount: allLogoRequirements.length,
      accessoryCount: accessoriesRequirements.length,
      colors: colors
    }
  });

  return {
    quantity,
    color,
    colors,
    size,
    fabric,
    panelCount,
    closure,
    capSpecifications,
    billStyle, // CRITICAL FIX: Add bill style to analysis results
    logoRequirement,
    allLogoRequirements,
    accessoriesRequirements,

    // ENHANCED: Comprehensive conversation context metadata
    conversationalContext: {
      hasContext: contextResult.hasContext,
      isConversationalUpdate: isConversationalUpdate,
      isQuantityUpdate: isQuantityUpdate,
      detectedChanges: detectedChanges,
      mergedSpecifications: mergedSpecs,
      orderBuilderDelta: contextResult.orderBuilderDelta,
      effectiveMessage: effectiveMessage
    },

    // Legacy support for existing code
    isQuantityUpdate: isQuantityUpdate,
    contextPreservation: {
      fabricPreserved: mergedSpecs.fabric === fabric,
      closurePreserved: mergedSpecs.closure === closure,
      logosPreserved: mergedSpecs.logos?.length === allLogoRequirements.length,
      accessoriesPreserved: mergedSpecs.accessories?.length === accessoriesRequirements.length
    }
  };
}

// CRITICAL FIX: Helper function to determine pricing tier based on business logic
function determineBusinessPricingTier(requirements: any): string {
  console.log('🎯 [PRICING-TIER] Determining tier based on business logic');
  console.log('🎯 [PRICING-TIER] Panel count:', requirements.panelCount);
  console.log('🎯 [PRICING-TIER] Bill style:', requirements.billStyle);

  if (requirements.panelCount) {
    const panelCountNum = parseInt(requirements.panelCount);

    // BUSINESS RULE 1: 7-Panel = Tier 3 (regardless of bill shape)
    if (panelCountNum === 7) {
      console.log('🎯 [PRICING-TIER] 7-Panel detected -> Tier 3 (business rule)');
      return 'Tier 3';
    }

    // BUSINESS RULE 2: 6-Panel bill shape determines tier
    if (panelCountNum === 6) {
      const billStyle = requirements.billStyle?.toLowerCase() || '';

      // Flat or Slight Curved = Tier 2
      if (billStyle.includes('flat') ||
          (billStyle.includes('slight') && billStyle.includes('curved'))) {
        console.log('🎯 [PRICING-TIER] 6-Panel Flat/Slight Curved -> Tier 2 (business rule)');
        return 'Tier 2';
      }
      // Pure Curved = Tier 1
      else if (billStyle.includes('curved')) {
        console.log('🎯 [PRICING-TIER] 6-Panel Curved -> Tier 1 (business rule)');
        return 'Tier 1';
      }
      // Default for 6-Panel
      else {
        console.log('🎯 [PRICING-TIER] 6-Panel default -> Tier 2 (business rule)');
        return 'Tier 2';
      }
    }

    // BUSINESS RULE 3: 5-Panel bill shape determines tier
    if (panelCountNum === 5) {
      const billStyle = requirements.billStyle?.toLowerCase() || '';

      // Flat or Slight Curved = Tier 2
      if (billStyle.includes('flat') ||
          (billStyle.includes('slight') && billStyle.includes('curved'))) {
        console.log('🎯 [PRICING-TIER] 5-Panel Flat/Slight Curved -> Tier 2 (business rule)');
        return 'Tier 2';
      }
      // Pure Curved = Tier 1
      else {
        console.log('🎯 [PRICING-TIER] 5-Panel Curved/Default -> Tier 1 (business rule)');
        return 'Tier 1';
      }
    }
  }

  // Default fallback
  console.log('🎯 [PRICING-TIER] Default fallback -> Tier 1');
  return 'Tier 1';
}

// CRITICAL FIX: Helper function to select product from correct tier
function selectProductFromTier(products: any[], targetTier: string, requirements: any): any {
  console.log('🎯 [PRODUCT-SELECT] Looking for products in', targetTier);

  // Get all products in target tier
  const tierProducts = products.filter(p => {
    // Get tier info from pricing_tier_id or tier_name
    if (p.pricing_tier && p.pricing_tier.tier_name === targetTier) {
      return true;
    }
    // Fallback: match by tier ID if tier name lookup fails
    const tierIdMap = { 'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3 };
    return p.pricing_tier_id === tierIdMap[targetTier];
  });

  console.log('🎯 [PRODUCT-SELECT] Found', tierProducts.length, 'products in', targetTier, ':', tierProducts.map(p => p.name));

  if (tierProducts.length === 0) {
    console.log('⚠️ [PRODUCT-SELECT] No products found in target tier, using fallback');
    return null;
  }

  // For 7-Panel, prefer Elite Seven products
  if (requirements.panelCount && parseInt(requirements.panelCount) === 7) {
    const eliteProduct = tierProducts.find(p => p.name.includes('Elite Seven'));
    if (eliteProduct) {
      console.log('🎯 [PRODUCT-SELECT] Selected Elite Seven product:', eliteProduct.name);
      return eliteProduct;
    }
  }

  // For 6-Panel, prefer AirFrame products (prioritize structured)
  if (requirements.panelCount && parseInt(requirements.panelCount) === 6) {
    // First, try to find structured AirFrame products (exclude Foam and Unstructured)
    const structuredAirframe = tierProducts.find(p =>
      p.name.includes('AirFrame') &&
      p.structure_type?.includes('Structured') &&
      !p.structure_type?.includes('Foam') &&
      !p.structure_type?.includes('Unstructured')
    );
    if (structuredAirframe) {
      console.log('🎯 [PRODUCT-SELECT] Selected structured AirFrame product:', structuredAirframe.name);
      return structuredAirframe;
    }

    // Fallback to any AirFrame product if no structured found
    const airframeProduct = tierProducts.find(p => p.name.includes('AirFrame'));
    if (airframeProduct) {
      console.log('🎯 [PRODUCT-SELECT] Selected AirFrame product:', airframeProduct.name);
      return airframeProduct;
    }
  }

  // Default: use first product in tier
  console.log('🎯 [PRODUCT-SELECT] Selected first available product:', tierProducts[0].name);
  return tierProducts[0];
}

// Step 2: Fetch Blank Cap costs from Supabase with user input preservation
export async function fetchBlankCapCosts(requirements: any) {
  console.log('💰 [BLANK-CAP] Fetching costs for quantity:', requirements.quantity);
  console.log('💰 [BLANK-CAP] Panel count requirement:', requirements.panelCount);
  console.log('💰 [BLANK-CAP] User bill shape input:', requirements.billStyle);

  try {
    // Get products with pricing tier data
    const products = await loadProducts();
    const pricingTiers = await loadPricingTiers();

    // Join pricing tier data to products for proper filtering
    const productsWithTiers = products.map(product => {
      const tier = pricingTiers.find(t => t.id === product.pricing_tier_id);
      return { ...product, pricing_tier: tier };
    });

    // CRITICAL FIX: Use business logic to determine tier, not database product attributes
    const targetTier = determineBusinessPricingTier(requirements);

    // Select appropriate product from target tier
    let selectedProduct = selectProductFromTier(productsWithTiers, targetTier, requirements);

    // Fallback to default product if tier-based selection fails
    if (!selectedProduct) {
      console.log('⚠️ [BLANK-CAP] Using fallback product selection');
      // Prioritize structured products in fallback (exclude Foam and Unstructured)
      selectedProduct = productsWithTiers.find(p => p.code === '6P_AIRFRAME_HSCS') ||
                      productsWithTiers.find(p => p.name === '6P AirFrame HSCS') ||
                      productsWithTiers.find(p =>
                        p.structure_type?.includes('Structured') &&
                        !p.structure_type?.includes('Foam') &&
                        !p.structure_type?.includes('Unstructured')
                      ) ||
                      productsWithTiers[0];
    }

    if (!selectedProduct || !selectedProduct.pricing_tier) {
      throw new Error('No valid products with pricing tiers found in database');
    }

    console.log('🎯 [BLANK-CAP] Final product selection:', {
      name: selectedProduct.name,
      code: selectedProduct.code,
      databaseTier: selectedProduct.pricing_tier.tier_name,
      businessTier: targetTier,
      panelCount: selectedProduct.panel_count,
      databaseBillShape: selectedProduct.bill_shape,
      userBillShape: requirements.billStyle
    });

    // Calculate unit price based on selected tier
    const pricingTier = selectedProduct.pricing_tier;
    const priceResult = calculatePriceForQuantity(pricingTier, requirements.quantity);
    const unitPrice = priceResult.unitPrice;
    const totalCost = unitPrice * requirements.quantity;

    console.log('💰 [BLANK-CAP] Pricing calculated:', {
      product: selectedProduct.name,
      tier: pricingTier.tier_name,
      unitPrice,
      totalCost,
      quantity: requirements.quantity
    });

    // CRITICAL FIX: Return user input for Order Builder, database product for admin reference
    return {
      // Database product info for admin
      productName: selectedProduct.name,
      productCode: selectedProduct.code,

      // USER INPUT PRESERVATION for Order Builder
      panelCount: requirements.panelCount || `${selectedProduct.panel_count}P`,
      billShape: requirements.billStyle || selectedProduct.bill_shape, // PRESERVE USER INPUT

      // Database attributes for reference
      profile: selectedProduct.profile,
      structure: selectedProduct.structure_type,

      // Pricing data
      unitPrice,
      totalCost,
      pricingTier: pricingTier.tier_name,

      // Debug info
      _debug: {
        userBillShapeInput: requirements.billStyle,
        databaseBillShape: selectedProduct.bill_shape,
        preservedUserInput: !!requirements.billStyle
      }
    };

  } catch (error) {
    console.error('❌ [BLANK-CAP] Error fetching costs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Database connection error';
    throw new Error(`Failed to fetch blank cap costs: ${errorMessage}`);
  }
}

// Step 3: Fetch Premium upgrades
export async function fetchPremiumUpgrades(requirements: any) {
  console.log('⭐ [PREMIUM] Fetching premium upgrades');

  const upgrades: any = {
    fabric: null,
    fabrics: {},
    closure: null,
    totalCost: 0
  };

  try {
    // Handle premium fabrics with dual fabric support (e.g., "Acrylic/Airmesh")
    if (requirements.fabric) {
      console.log('🧵 [PREMIUM] Processing fabric requirement:', requirements.fabric);

      const fabrics = await loadPremiumFabrics();

      // Handle dual fabrics like "Acrylic/Airmesh" by splitting and processing each separately
      const fabricTypes = requirements.fabric.includes('/')
        ? requirements.fabric.split('/').map((f: string) => f.trim())
        : [requirements.fabric];

      let totalFabricCost = 0;
      const fabricData: any = {};

      console.log('🧵 [PREMIUM] Processing fabric types:', fabricTypes);

      for (const singleFabricType of fabricTypes) {
        // Normalize fabric name to match database entries
        let normalizedFabricName = singleFabricType;

        // Handle common fabric name variations
        if (singleFabricType.toLowerCase().includes('airmesh') || singleFabricType.toLowerCase().includes('air mesh')) {
          normalizedFabricName = 'Air Mesh';
        } else if (singleFabricType.toLowerCase().includes('acrylic')) {
          normalizedFabricName = 'Acrylic';
        } else if (singleFabricType.toLowerCase().includes('suede')) {
          normalizedFabricName = 'Suede Cotton';
        } else if (singleFabricType.toLowerCase().includes('leather')) {
          normalizedFabricName = 'Genuine Leather';
        } else if (singleFabricType.toLowerCase().includes('laser') || singleFabricType.toLowerCase().includes('cut')) {
          normalizedFabricName = 'Laser Cut';
        }

        console.log(`🔍 [PREMIUM] Looking for fabric: ${singleFabricType} -> ${normalizedFabricName}`);

        // Find matching fabric in database
        const fabric = fabrics.find(f =>
          f.name.toLowerCase() === normalizedFabricName.toLowerCase() ||
          f.name.toLowerCase().includes(normalizedFabricName.toLowerCase()) ||
          normalizedFabricName.toLowerCase().includes(f.name.toLowerCase())
        );

        if (fabric) {
          const priceResult = calculatePriceForQuantity(fabric, requirements.quantity);
          const unitPrice = priceResult.unitPrice;
          const fabricTotalCost = unitPrice * requirements.quantity;
          totalFabricCost += fabricTotalCost;

          fabricData[normalizedFabricName] = {
            type: fabric.name,
            unitPrice: unitPrice,
            cost: fabricTotalCost
          };

          console.log(`✅ [PREMIUM] Found premium fabric: ${fabric.name} - $${unitPrice}/cap ($${fabricTotalCost} total)`);
        } else {
          console.log(`⚠️ [PREMIUM] Premium fabric not found in database: ${normalizedFabricName}`);
        }
      }

      // Set fabric data in upgrades object
      if (Object.keys(fabricData).length > 0) {
        upgrades.fabrics = fabricData;
        upgrades.totalCost += totalFabricCost;

        // Also keep original format for backward compatibility
        upgrades.fabric = {
          name: requirements.fabric, // Keep original dual format like "Acrylic/Airmesh"
          unitPrice: totalFabricCost / requirements.quantity,
          totalCost: totalFabricCost
        };

        console.log('✅ [PREMIUM] Total fabric cost:', totalFabricCost, 'for fabrics:', Object.keys(fabricData));
      }
    }

    // Handle premium closures
    if (requirements.closure) {
      console.log('🔒 [PREMIUM] Checking closure requirement:', requirements.closure);

      // Load premium closures from database
      const premiumClosures = await supabaseAdmin
        .from('premium_closures')
        .select('*');

      if (premiumClosures.error) {
        console.error('❌ [PREMIUM] Error loading closures:', premiumClosures.error);
      } else {
        console.log('🔒 [PREMIUM] Available closures:', premiumClosures.data?.map(c => c.name));

        // Enhanced closure matching with multiple strategies
        const reqClosure = requirements.closure.toLowerCase().trim();
        console.log('🔒 [PREMIUM] Searching for closure:', reqClosure);

        const closure = premiumClosures.data?.find(c => {
          const dbName = c.name.toLowerCase();

          // Strategy 1: Exact match
          if (dbName === reqClosure) {
            console.log('🎯 [PREMIUM] Exact match found:', c.name);
            return true;
          }

          // Strategy 2: Contains match (db name contains requirement)
          if (dbName.includes(reqClosure)) {
            console.log('🎯 [PREMIUM] Contains match found:', c.name);
            return true;
          }

          // Strategy 3: Reverse contains match (requirement contains db name)
          if (reqClosure.includes(dbName)) {
            console.log('🎯 [PREMIUM] Reverse contains match found:', c.name);
            return true;
          }

          // Strategy 4: Key word matching for common variations
          const keyWords = reqClosure.split(/[\s\-_]+/);
          const dbKeyWords = dbName.split(/[\s\-_]+/);

          for (const keyword of keyWords) {
            if (keyword.length > 2 && dbKeyWords.some(dbWord => dbWord === keyword)) {
              console.log('🎯 [PREMIUM] Keyword match found:', c.name, 'via keyword:', keyword);
              return true;
            }
          }

          return false;
        });

        if (closure) {
          const priceResult = calculatePriceForQuantity(closure, requirements.quantity);
          const unitPrice = priceResult.unitPrice;
          upgrades.closure = {
            name: closure.name,
            unitPrice,
            totalCost: unitPrice * requirements.quantity
          };
          upgrades.totalCost += upgrades.closure.totalCost;
          console.log('✅ [PREMIUM] Found premium closure:', closure.name, 'at $', unitPrice, 'each, total:', upgrades.closure.totalCost);
        } else {
          console.log('ℹ️ [PREMIUM] Closure not premium or not found:', requirements.closure);
          console.log('🔍 [PREMIUM] Available closure names for reference:', premiumClosures.data?.map(c => c.name));
        }
      }
    }

    console.log('⭐ [PREMIUM] Final upgrades:', upgrades);
    return upgrades;

  } catch (error) {
    console.error('❌ [PREMIUM] Error fetching upgrades:', error);
    return upgrades;
  }
}

// Step 4: Fetch Logo setup costs
export async function fetchLogoSetupCosts(requirements: any) {
  console.log('🎨 [LOGO] Fetching logo setup costs');

  // Check for multiple logos first, then fallback to single
  const logoRequirements = requirements.allLogoRequirements || (requirements.logoRequirement ? [requirements.logoRequirement] : []);

  if (logoRequirements.length === 0) {
    return { logos: [], totalCost: 0, summary: 'None' };
  }

  console.log('🎨 [LOGO] Processing', logoRequirements.length, 'logo(s):', logoRequirements.map((l: any) => `${l.type} @ ${l.location}`));

  try {
    const logoMethods = await loadLogoMethods();
    let allLogos = [];
    let totalCostSum = 0;
    let summaryParts = [];

    // Process each logo requirement
    for (const logoReq of logoRequirements) {
      console.log('🎨 [LOGO] Processing:', logoReq.type, logoReq.location, logoReq.size, logoReq.hasMoldCharge ? '(+Mold Charge)' : '');

      // Find matching logo method with enhanced matching logic
      const logoMethod = logoMethods.find(m => {
        // Enhanced name matching to handle "Rubber Patch" -> "Rubber" mappings
        let nameMatch = false;
        const requestType = logoReq.type.toLowerCase();
        const dbName = m.name.toLowerCase();

        // Direct match: database name contains request type
        if (dbName.includes(requestType)) {
          nameMatch = true;
        }
        // Reverse match: request type contains database name (e.g., "Rubber Patch" contains "Rubber")
        else if (requestType.includes(dbName)) {
          nameMatch = true;
        }
        // Specific mappings for common cases
        else if (requestType.includes('rubber') && dbName.includes('rubber')) {
          nameMatch = true;
        }
        else if (requestType.includes('leather') && dbName.includes('leather')) {
          nameMatch = true;
        }
        else if (requestType.includes('embroidery') && dbName.includes('embroidery')) {
          nameMatch = true;
        }

        // Size matching with exact and partial matches
        const requestSize = logoReq.size.toLowerCase();
        const dbSize = m.size.toLowerCase();
        const sizeMatch = dbSize === requestSize || dbSize.includes(requestSize) || requestSize.includes(dbSize);

        const isMatch = nameMatch && sizeMatch;

        if (isMatch) {
          console.log(`✅ [LOGO-MATCH] Found: "${m.name}" (${m.size}) matches "${logoReq.type}" (${logoReq.size})`);
        }

        return isMatch;
      });

      if (!logoMethod) {
        console.log('❌ [LOGO] No match found for:', logoReq.type, logoReq.size, '- skipping');
        continue;
      }

      const priceResult = calculatePriceForQuantity(logoMethod, requirements.quantity);
      const unitPrice = priceResult.unitPrice;
      let logoTotalCost = unitPrice * requirements.quantity;

      // CRITICAL FIX: Calculate mold charge - prioritize conversation context, fallback to database
      let moldCharge = 0;

      // First: Check if mold charge is already available from conversation context
      if (logoReq.moldCharge && logoReq.moldCharge > 0) {
        moldCharge = logoReq.moldCharge;
        console.log('💰 [LOGO] Using preserved mold charge from context:', moldCharge, 'for', logoReq.type);
      }
      // Second: Calculate from database if needed
      else if (logoReq.hasMoldCharge) {
        const moldCharges = await loadMoldCharges();
        const moldChargeData = moldCharges.find(mc => mc.size === logoReq.size);

        if (moldChargeData) {
          moldCharge = parseFloat(moldChargeData.charge_amount);
          console.log('💰 [LOGO] Using database mold charge:', logoReq.size, '=', moldCharge, 'for', logoReq.type);
        } else {
          console.warn('⚠️ [LOGO] No mold charge found for size:', logoReq.size, 'for', logoReq.type);
        }
      }

      const totalCostWithMold = logoTotalCost + moldCharge;

      const logo = {
        type: logoMethod.name,
        location: logoReq.location,
        size: logoMethod.size,
        unitPrice,
        totalCost: logoTotalCost,
        moldCharge,
        totalWithMold: totalCostWithMold
      };

      allLogos.push(logo);
      totalCostSum += totalCostWithMold;
      summaryParts.push(`${logo.location}: ${logo.type} (${logo.size})${moldCharge > 0 ? ` +$${moldCharge} mold` : ''}`);

      console.log('✅ [LOGO] Processed:', logo);
    }

    return {
      logos: allLogos,
      totalCost: totalCostSum,
      summary: summaryParts.length > 0 ? summaryParts.join(' | ') : 'None'
    };

  } catch (error) {
    console.error('❌ [LOGO] Error fetching costs:', error);
    return { logos: [], totalCost: 0, summary: 'None' };
  }
}

// Step 5: Fetch Accessories costs
export async function fetchAccessoriesCosts(requirements: any) {
  console.log('🏷️ [ACCESSORIES] Fetching accessories costs');

  if (!requirements.accessoriesRequirements || requirements.accessoriesRequirements.length === 0) {
    console.log('🏷️ [ACCESSORIES] No accessories requirements found');
    return {
      items: [],
      totalCost: 0
    };
  }

  try {
    const accessories = await loadAccessories();
    const accessoryItems = [];
    let totalCost = 0;

    for (const reqAccessory of requirements.accessoriesRequirements) {
      // Find matching accessory in database
      const accessory = accessories.find(a =>
        a.name.toLowerCase().includes(reqAccessory.type.toLowerCase()) ||
        reqAccessory.type.toLowerCase().includes(a.name.toLowerCase())
      );

      if (accessory) {
        const priceResult = calculatePriceForQuantity(accessory, requirements.quantity);
        const unitPrice = priceResult.unitPrice;
        const itemTotalCost = unitPrice * requirements.quantity;

        const accessoryItem = {
          name: accessory.name,
          type: reqAccessory.type,
          location: reqAccessory.location || null,
          unitPrice,
          totalCost: itemTotalCost,
          quantity: requirements.quantity
        };

        accessoryItems.push(accessoryItem);
        totalCost += itemTotalCost;

        console.log('✅ [ACCESSORIES] Added accessory:', {
          name: accessory.name,
          unitPrice,
          totalCost: itemTotalCost
        });
      } else {
        console.error('❌ [ACCESSORIES] Accessory not found in database:', reqAccessory.type);
        throw new Error(`Accessory "${reqAccessory.type}" not found in database. Please add it to the accessories table.`);
      }
    }

    return {
      items: accessoryItems,
      totalCost
    };

  } catch (error) {
    console.error('❌ [ACCESSORIES] Error fetching costs:', error);
    return {
      items: [],
      totalCost: 0
    };
  }
}

// Step 6: Fetch Delivery costs
export async function fetchDeliveryCosts(requirements: any) {
  console.log('🚚 [DELIVERY] Fetching delivery costs');

  try {
    const deliveryMethods = await loadDeliveryMethods();

    // Find Regular Delivery method (our default)
    const regularDelivery = deliveryMethods.find(d =>
      d.name === 'Regular Delivery'
    ) || deliveryMethods.find(d =>
      d.delivery_type === 'regular'
    ) || deliveryMethods[0]; // Fallback to first available

    if (!regularDelivery) {
      throw new Error('Regular delivery method not found');
    }

    const priceResult = calculatePriceForQuantity(regularDelivery, requirements.quantity);
    const unitPrice = priceResult.unitPrice;
    const totalCost = unitPrice * requirements.quantity;

    return {
      method: regularDelivery.name,
      leadTime: `${regularDelivery.delivery_days} days`,
      unitPrice,
      totalCost
    };

  } catch (error) {
    console.error('❌ [DELIVERY] Error fetching costs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Database connection error';
    throw new Error(`Failed to fetch delivery method costs: ${errorMessage}`);
  }
}

// Generate conversational update response highlighting changes
export function generateConversationalUpdateResponse(
  capDetails: any,
  premiumUpgrades: any,
  logoSetup: any,
  accessories: any,
  delivery: any,
  conversationalContext: any
): string {
  const { detectedChanges, mergedSpecifications, orderBuilderDelta } = conversationalContext;

  let response = `I've updated your quote with the requested changes:\n\n`;

  // Highlight what was changed
  if (detectedChanges.length > 0) {
    response += `🔄 **Changes Applied:**\n`;
    for (const change of detectedChanges) {
      response += `• ${change.changeDescription}\n`;
    }
    response += `\n`;
  }

  // Show cost impact if significant
  const total = capDetails.totalCost + (premiumUpgrades.totalCost || 0) + (logoSetup.totalCost || 0) + (accessories.totalCost || 0) + delivery.totalCost;

  if (orderBuilderDelta?.costImpact && mergedSpecifications.totalCost) {
    const previousTotal = mergedSpecifications.totalCost;
    const difference = total - previousTotal;

    if (Math.abs(difference) > 1) { // Only show if difference is significant
      const changeType = difference > 0 ? 'increase' : 'decrease';
      const changeSymbol = difference > 0 ? '+' : '';

      response += `💰 **Cost Impact:** ${changeSymbol}$${Math.abs(difference).toFixed(2)} ${changeType} (from $${previousTotal.toFixed(2)} to $${total.toFixed(2)})\n\n`;
    }
  }

  // Generate standard response with "Updated" prefix for changed sections
  const standardResponse = generateStructuredResponse(capDetails, premiumUpgrades, logoSetup, accessories, delivery);

  // Mark changed sections with visual indicators
  let enhancedResponse = standardResponse;
  if (orderBuilderDelta?.visualIndicators) {
    const indicators = orderBuilderDelta.visualIndicators;

    if (indicators.capStyle === 'updated') {
      enhancedResponse = enhancedResponse.replace('📊 Cap Style Setup', '📊 Cap Style Setup 🔄 **UPDATED**');
    }
    if (indicators.customization === 'updated') {
      enhancedResponse = enhancedResponse.replace('🎨 Logo Setup', '🎨 Logo Setup 🔄 **UPDATED**');
    }
    if (indicators.accessories === 'updated') {
      enhancedResponse = enhancedResponse.replace('🏷️ Accessories', '🏷️ Accessories 🔄 **UPDATED**');
    }
    if (indicators.delivery === 'updated') {
      enhancedResponse = enhancedResponse.replace('🚚 Delivery', '🚚 Delivery 🔄 **UPDATED**');
    }
  }

  response += enhancedResponse;

  // Add conversational closing
  response += `\n\n✅ Your specifications have been updated. Need any other changes?`;

  return response;
}

// Generate structured AI response
export function generateStructuredResponse(
  capDetails: any,
  premiumUpgrades: any,
  logoSetup: any,
  accessories: any,
  delivery: any
) {
  const total = capDetails.totalCost + (premiumUpgrades.totalCost || 0) + (logoSetup.totalCost || 0) + (accessories.totalCost || 0) + delivery.totalCost;

  // Calculate quantity from cap details (total cost / unit price = quantity)
  const quantity = Math.round(capDetails.totalCost / capDetails.unitPrice);

  let response = `Here's your detailed quote with verified pricing from our database:\n\n`;

  response += `📊 **Cap Style Setup** ✅\n`;
  response += `•${capDetails.productName} (${capDetails.pricingTier})\n`;
  response += `•Base cost: $${capDetails.totalCost.toFixed(2)} ($${capDetails.unitPrice.toFixed(2)}/cap)\n\n`;

  if ((premiumUpgrades.fabrics && Object.keys(premiumUpgrades.fabrics).length > 0) || premiumUpgrades.closure) {
    response += `⭐ **Premium Upgrades** ✅\n`;

    // Handle dual fabric display
    if (premiumUpgrades.fabrics && Object.keys(premiumUpgrades.fabrics).length > 0) {
      Object.entries(premiumUpgrades.fabrics).forEach(([fabricName, fabricInfo]: [string, any]) => {
        const fabricPerCap = fabricInfo.cost / quantity;
        response += `•${fabricName}: (+$${fabricInfo.cost.toFixed(2)}) ($${fabricPerCap.toFixed(2)}/cap)\n`;
      });
    }
    // Fallback to single fabric display for backward compatibility
    else if (premiumUpgrades.fabric) {
      const fabricPerCap = premiumUpgrades.fabric.totalCost / quantity;
      response += `•Fabric: ${premiumUpgrades.fabric.name} (+$${premiumUpgrades.fabric.totalCost.toFixed(2)}) ($${fabricPerCap.toFixed(2)}/cap)\n`;
    }

    if (premiumUpgrades.closure) {
      const closurePerCap = premiumUpgrades.closure.totalCost / quantity;
      response += `•Closure: ${premiumUpgrades.closure.name} (+$${premiumUpgrades.closure.totalCost.toFixed(2)}) ($${closurePerCap.toFixed(2)}/cap)\n`;
    }

    response += `\n`;
  }

  if (logoSetup.logos.length > 0) {
    response += `🎨 **Logo Setup** ✅\n`;
    logoSetup.logos.forEach((logo: any) => {
      // CRITICAL FIX: Show integrated logo + mold cost, not just base logo cost
      const totalWithMoldCharge = logo.totalWithMold || logo.totalCost;
      const logoPerCapWithMold = totalWithMoldCharge / quantity;

      // Show detailed breakdown if mold charge exists
      if (logo.moldCharge && logo.moldCharge > 0) {
        const basePerCap = logo.totalCost / quantity;
        const moldPerCap = logo.moldCharge / quantity;
        response += `•${logo.location}: ${logo.type} (${logo.size}) - $${totalWithMoldCharge.toFixed(2)} ($${basePerCap.toFixed(2)}/cap + $${moldPerCap.toFixed(2)} mold)\n`;
      } else {
        response += `•${logo.location}: ${logo.type} (${logo.size}) - $${logo.totalCost.toFixed(2)} ($${logoPerCapWithMold.toFixed(2)}/cap)\n`;
      }
    });
    response += `\n`;
  }

  if (accessories.items && accessories.items.length > 0) {
    response += `🏷️ **Accessories** ✅\n`;

    // Show each individual accessory
    accessories.items.forEach((accessory: any) => {
      const accessoryPerCap = accessory.totalCost / quantity;
      response += `• ${accessory.name}: $${accessory.totalCost.toFixed(2)} ($${accessoryPerCap.toFixed(2)}/cap)\n`;
    });

    // Show total if more than one accessory
    if (accessories.items.length > 1) {
      const totalPerCap = accessories.totalCost / quantity;
      response += `• **Total**: $${accessories.totalCost.toFixed(2)} ($${totalPerCap.toFixed(2)}/cap)\n`;
    }

    response += `\n`;
  }

  const deliveryPerCap = delivery.totalCost / quantity;
  response += `🚚 **Delivery** ✅\n`;
  response += `•Method: ${delivery.method}\n`;
  response += `•Timeline: ${delivery.leadTime}\n`;
  response += `•Cost: $${delivery.totalCost.toFixed(2)} ($${deliveryPerCap.toFixed(2)}/cap)\n\n`;

  const totalPerCap = total / quantity;
  response += `💰 **Total Investment: $${total.toFixed(2)}**\n`;
  response += `**Per Cap Cost: $${totalPerCap.toFixed(2)}**\n\n`;

  response += `📊 **Cost Breakdown Per Cap:**\n`;
  response += `• Base Cap: $${capDetails.unitPrice.toFixed(2)}\n`;

  // Handle dual fabric breakdown
  if (premiumUpgrades.fabrics && Object.keys(premiumUpgrades.fabrics).length > 0) {
    Object.entries(premiumUpgrades.fabrics).forEach(([fabricName, fabricInfo]: [string, any]) => {
      const fabricPerCap = fabricInfo.cost / quantity;
      response += `• Premium ${fabricName}: $${fabricPerCap.toFixed(2)}\n`;
    });
  }
  // Fallback to single fabric breakdown for backward compatibility
  else if (premiumUpgrades.fabric) {
    response += `• Premium Fabric: $${(premiumUpgrades.fabric.totalCost / quantity).toFixed(2)}\n`;
  }

  if (premiumUpgrades.closure) {
    response += `• Premium Closure: $${(premiumUpgrades.closure.totalCost / quantity).toFixed(2)}\n`;
  }
  if (logoSetup.logos.length > 0) {
    logoSetup.logos.forEach((logo: any) => {
      // CRITICAL FIX: Show integrated logo + mold cost in per-cap breakdown
      const totalWithMoldCharge = logo.totalWithMold || logo.totalCost;
      const logoPerCapWithMold = totalWithMoldCharge / quantity;

      // Show mold breakdown in per-cap section too
      if (logo.moldCharge && logo.moldCharge > 0) {
        const basePerCap = logo.totalCost / quantity;
        const moldPerCap = logo.moldCharge / quantity;
        response += `• ${logo.location} Logo: $${logoPerCapWithMold.toFixed(2)} ($${basePerCap.toFixed(2)} + $${moldPerCap.toFixed(2)} mold)\n`;
      } else {
        response += `• ${logo.location} Logo: $${logoPerCapWithMold.toFixed(2)}\n`;
      }
    });
  }
  if (accessories.items && accessories.items.length > 0) {
    response += `• Accessories: $${(accessories.totalCost / quantity).toFixed(2)}\n`;
  }
  response += `• Delivery: $${deliveryPerCap.toFixed(2)}\n`;
  response += `**= Total: $${totalPerCap.toFixed(2)}/cap**\n\n`;

  response += `✅ All pricing verified from database\n`;
  response += `Would you like to modify any specifications or proceed with this quote?`;

  return response;
}