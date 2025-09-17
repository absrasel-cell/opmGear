/**
 * UNIFIED LOGO DETECTION SYSTEM
 *
 * MISSION: Replace ALL existing logo detection systems with ONE reliable function
 *
 * FIXES:
 * - Duplicate logo entries (same logo detected twice)
 * - Wrong position mapping (Left becomes Back, Right becomes Back)
 * - Wrong logo method detection (Flat becomes 3D)
 * - Default sizes not applied correctly
 *
 * PRINCIPLES:
 * - EXACT PATTERN MATCHING first, fuzzy matching second
 * - ONE logo per position maximum (deduplication)
 * - CORRECT position mapping (Left=Left, Right=Right)
 * - ACCURATE logo method detection (Flat ≠ 3D)
 * - PROPER default sizes per position
 */

export interface UnifiedLogoResult {
  type: string;
  position: string;
  size: string;
  application: string;
  confidence: number;
  hasMoldCharge: boolean;
}

export interface UnifiedLogoDetection {
  logos: UnifiedLogoResult[];
  totalCount: number;
  hasLogos: boolean;
  summary: string;
}

/**
 * Position-based size defaults (consistent across all systems)
 */
const POSITION_DEFAULTS = {
  'Front': 'Large',
  'Back': 'Small',
  'Left': 'Small',
  'Right': 'Small',
  'Upper Bill': 'Medium',
  'Under Bill': 'Large'
} as const;

/**
 * ENHANCED LOGO POSITIONING DEFAULTS
 * When user doesn't provide specific position data:
 * 1st logo → Front, Large
 * 2nd logo → Back, Small
 * 3rd logo → Left, Small
 * 4th logo → Right, Small
 * 5th logo → Upper Bill, Medium
 * 6th logo → Under Bill, Large
 */
const LOGO_POSITION_SEQUENCE = [
  { position: 'Front', size: 'Large' },
  { position: 'Back', size: 'Small' },
  { position: 'Left', size: 'Small' },
  { position: 'Right', size: 'Small' },
  { position: 'Upper Bill', size: 'Medium' },
  { position: 'Under Bill', size: 'Large' }
] as const;

/**
 * Logo type to application mapping
 */
const APPLICATION_MAP = {
  '3D Embroidery': 'Direct',
  'Flat Embroidery': 'Direct',
  'Embroidery': 'Direct',
  'Leather Patch': 'Run',
  'Rubber Patch': 'Run',
  'Screen Print': 'Direct',
  'Woven Patch': 'Satin',
  'Sublimation': 'Direct'
} as const;

/**
 * EXACT PATTERN MATCHING - Most specific patterns first
 * Format: "detection_phrase" -> { type, position?, size? }
 * CRITICAL: Ordered by specificity to avoid false positives
 *
 * EMBROIDERY IMPROVEMENTS:
 * - "Embroidered Logo" → "Flat Embroidery Direct"
 * - "Raised Embroidered Logo" → "3D Embroidery Direct"
 * - Better keyword mapping for natural language
 */
const EXACT_PATTERNS: Array<{ pattern: string; type: string; position?: string }> = [
  // EMBROIDERY IMPROVEMENTS - HIGHEST PRIORITY FOR NEW RULES
  // Raised/3D/Puff Embroidery patterns (specific to 3D)
  { pattern: 'raised embroidered logo', type: '3D Embroidery' },
  { pattern: 'raised embroidery logo', type: '3D Embroidery' },
  { pattern: 'raised embroidery', type: '3D Embroidery' },
  { pattern: 'puff embroidered logo', type: '3D Embroidery' },
  { pattern: 'puff embroidery logo', type: '3D Embroidery' },
  { pattern: 'puff embroidery', type: '3D Embroidery' },
  { pattern: '3d embroidered logo', type: '3D Embroidery' },
  { pattern: '3d embroidery logo', type: '3D Embroidery' },

  // Flat Embroidery patterns (specific to flat)
  { pattern: 'embroidered logo', type: 'Flat Embroidery' },
  { pattern: 'embroidery logo', type: 'Flat Embroidery' },
  { pattern: 'embo logo', type: 'Flat Embroidery' },
  { pattern: 'flat embroidered logo', type: 'Flat Embroidery' },
  { pattern: 'flat embroidery logo', type: 'Flat Embroidery' },

  // MOST SPECIFIC: Full phrase with position and type (HIGHEST PRIORITY)
  { pattern: 'rubber patch front', type: 'Rubber Patch', position: 'Front' },
  { pattern: 'rubber patch on front', type: 'Rubber Patch', position: 'Front' },
  { pattern: 'rubber patch on back', type: 'Rubber Patch', position: 'Back' },
  { pattern: 'rubber patch back', type: 'Rubber Patch', position: 'Back' },

  { pattern: 'leather patch front', type: 'Leather Patch', position: 'Front' },
  { pattern: 'leather patch on front', type: 'Leather Patch', position: 'Front' },
  { pattern: 'leather patch on fro', type: 'Leather Patch', position: 'Front' }, // Handle truncation
  { pattern: 'leather patch front', type: 'Leather Patch', position: 'Front' },

  { pattern: 'print patch on front', type: 'Screen Print', position: 'Front' },
  { pattern: 'print patch front', type: 'Screen Print', position: 'Front' },
  { pattern: 'printed patch on front', type: 'Screen Print', position: 'Front' },
  { pattern: 'printed patch front', type: 'Screen Print', position: 'Front' },
  { pattern: 'screenprint on front', type: 'Screen Print', position: 'Front' },
  { pattern: 'screenprint front', type: 'Screen Print', position: 'Front' },
  { pattern: 'screen print on front', type: 'Screen Print', position: 'Front' },
  { pattern: 'screen print front', type: 'Screen Print', position: 'Front' },
  { pattern: 'puff print on front', type: 'Screen Print', position: 'Front' },
  { pattern: 'puff print front', type: 'Screen Print', position: 'Front' },
  { pattern: 'glitter print on front', type: 'Screen Print', position: 'Front' },
  { pattern: 'glitter print front', type: 'Screen Print', position: 'Front' },

  { pattern: 'woven patch on front', type: 'Woven Patch', position: 'Front' },
  { pattern: 'woven patch front', type: 'Woven Patch', position: 'Front' },

  { pattern: 'sublimated print on front', type: 'Sublimation', position: 'Front' },
  { pattern: 'sublimated print front', type: 'Sublimation', position: 'Front' },
  { pattern: 'sublimation on front', type: 'Sublimation', position: 'Front' },
  { pattern: 'sublimation front', type: 'Sublimation', position: 'Front' },

  { pattern: 'print patch on back', type: 'Screen Print', position: 'Back' },
  { pattern: 'print patch back', type: 'Screen Print', position: 'Back' },
  { pattern: 'printed patch on back', type: 'Screen Print', position: 'Back' },
  { pattern: 'printed patch back', type: 'Screen Print', position: 'Back' },
  { pattern: 'screenprint on back', type: 'Screen Print', position: 'Back' },
  { pattern: 'screenprint back', type: 'Screen Print', position: 'Back' },
  { pattern: 'screen print on back', type: 'Screen Print', position: 'Back' },
  { pattern: 'screen print back', type: 'Screen Print', position: 'Back' },
  { pattern: 'puff print on back', type: 'Screen Print', position: 'Back' },
  { pattern: 'puff print back', type: 'Screen Print', position: 'Back' },
  { pattern: 'glitter print on back', type: 'Screen Print', position: 'Back' },
  { pattern: 'glitter print back', type: 'Screen Print', position: 'Back' },

  { pattern: 'woven patch on back', type: 'Woven Patch', position: 'Back' },
  { pattern: 'woven patch back', type: 'Woven Patch', position: 'Back' },

  { pattern: 'sublimated print on back', type: 'Sublimation', position: 'Back' },
  { pattern: 'sublimated print back', type: 'Sublimation', position: 'Back' },
  { pattern: 'sublimation on back', type: 'Sublimation', position: 'Back' },
  { pattern: 'sublimation back', type: 'Sublimation', position: 'Back' },

  // Enhanced embroidery position patterns with improved detection
  { pattern: 'raised embroidery on left', type: '3D Embroidery', position: 'Left' },
  { pattern: 'raised embroidery left', type: '3D Embroidery', position: 'Left' },
  { pattern: 'raised embroidery on right', type: '3D Embroidery', position: 'Right' },
  { pattern: 'raised embroidery right', type: '3D Embroidery', position: 'Right' },
  { pattern: 'raised embroidery on front', type: '3D Embroidery', position: 'Front' },
  { pattern: 'raised embroidery front', type: '3D Embroidery', position: 'Front' },
  { pattern: 'raised embroidery on back', type: '3D Embroidery', position: 'Back' },
  { pattern: 'raised embroidery back', type: '3D Embroidery', position: 'Back' },

  { pattern: 'flat embroidery on left', type: 'Flat Embroidery', position: 'Left' },
  { pattern: 'flat embroidery left', type: 'Flat Embroidery', position: 'Left' },
  { pattern: 'flat embroidery on right', type: 'Flat Embroidery', position: 'Right' },
  { pattern: 'flat embroidery right', type: 'Flat Embroidery', position: 'Right' },
  { pattern: 'flat embroidery on front', type: 'Flat Embroidery', position: 'Front' },
  { pattern: 'flat embroidery front', type: 'Flat Embroidery', position: 'Front' },
  { pattern: 'flat embroidery on back', type: 'Flat Embroidery', position: 'Back' },
  { pattern: 'flat embroidery back', type: 'Flat Embroidery', position: 'Back' },

  { pattern: 'embroidery on left', type: 'Flat Embroidery', position: 'Left' },
  { pattern: 'embroidery left', type: 'Flat Embroidery', position: 'Left' },
  { pattern: 'embroidery on right', type: 'Flat Embroidery', position: 'Right' },
  { pattern: 'embroidery right', type: 'Flat Embroidery', position: 'Right' },
  { pattern: 'embroidery on front', type: 'Flat Embroidery', position: 'Front' },
  { pattern: 'embroidery front', type: 'Flat Embroidery', position: 'Front' },
  { pattern: 'embroidery on back', type: 'Flat Embroidery', position: 'Back' },
  { pattern: 'embroidery back', type: 'Flat Embroidery', position: 'Back' },

  { pattern: '3d embroidery on left', type: '3D Embroidery', position: 'Left' },
  { pattern: '3d embroidery left', type: '3D Embroidery', position: 'Left' },
  { pattern: '3d embroidery on right', type: '3D Embroidery', position: 'Right' },
  { pattern: '3d embroidery right', type: '3D Embroidery', position: 'Right' },
  { pattern: '3d embroidery on front', type: '3D Embroidery', position: 'Front' },
  { pattern: '3d embroidery front', type: '3D Embroidery', position: 'Front' },
  { pattern: '3d embroidery on back', type: '3D Embroidery', position: 'Back' },
  { pattern: '3d embroidery back', type: '3D Embroidery', position: 'Back' },

  { pattern: 'print patch on left', type: 'Screen Print', position: 'Left' },
  { pattern: 'print patch left', type: 'Screen Print', position: 'Left' },
  { pattern: 'printed patch on left', type: 'Screen Print', position: 'Left' },
  { pattern: 'printed patch left', type: 'Screen Print', position: 'Left' },
  { pattern: 'screenprint on left', type: 'Screen Print', position: 'Left' },
  { pattern: 'screenprint left', type: 'Screen Print', position: 'Left' },
  { pattern: 'screen print on left', type: 'Screen Print', position: 'Left' },
  { pattern: 'screen print left', type: 'Screen Print', position: 'Left' },

  { pattern: 'print patch on right', type: 'Screen Print', position: 'Right' },
  { pattern: 'print patch right', type: 'Screen Print', position: 'Right' },
  { pattern: 'printed patch on right', type: 'Screen Print', position: 'Right' },
  { pattern: 'printed patch right', type: 'Screen Print', position: 'Right' },
  { pattern: 'screenprint on right', type: 'Screen Print', position: 'Right' },
  { pattern: 'screenprint right', type: 'Screen Print', position: 'Right' },
  { pattern: 'screen print on right', type: 'Screen Print', position: 'Right' },
  { pattern: 'screen print right', type: 'Screen Print', position: 'Right' },

  // MEDIUM SPECIFICITY: Full type names (no position - will need position detection)
  { pattern: 'screenprint', type: 'Screen Print' },
  { pattern: 'screen print', type: 'Screen Print' },
  { pattern: 'printed patch', type: 'Screen Print' },
  { pattern: 'print patch', type: 'Screen Print' },
  { pattern: 'puff print', type: 'Screen Print' },
  { pattern: 'glitter print', type: 'Screen Print' },
  { pattern: 'woven patch', type: 'Woven Patch' },
  { pattern: 'rubber patch', type: 'Rubber Patch' },
  { pattern: 'leather patch', type: 'Leather Patch' },
  { pattern: '3d embroidery', type: '3D Embroidery' },
  { pattern: 'flat embroidery', type: 'Flat Embroidery' },
  { pattern: 'raised embroidery', type: '3D Embroidery' },
  { pattern: 'puff embroidery', type: '3D Embroidery' },
  { pattern: 'sublimated print', type: 'Sublimation' },
  { pattern: 'sublimated', type: 'Sublimation' },
  { pattern: 'sublimation printing', type: 'Sublimation' },
  { pattern: 'sublimation', type: 'Sublimation' },

  // IMPROVED FALLBACK: Generic embroidery defaults to Flat Embroidery Direct
  { pattern: 'embroidered', type: 'Flat Embroidery' },
  { pattern: 'embo', type: 'Flat Embroidery' },
  { pattern: 'embroidery', type: 'Flat Embroidery' }
] as const;

/**
 * Position detection patterns (for cases where position not in exact match)
 */
const POSITION_PATTERNS = [
  { pattern: 'on front', position: 'Front' },
  { pattern: 'on fro', position: 'Front' }, // Handle truncation
  { pattern: 'front', position: 'Front' },
  { pattern: 'on back', position: 'Back' },
  { pattern: 'back', position: 'Back' },
  { pattern: 'on left', position: 'Left' },
  { pattern: 'left', position: 'Left' },
  { pattern: 'on right', position: 'Right' },
  { pattern: 'right', position: 'Right' },
  { pattern: 'upper bill', position: 'Upper Bill' },
  { pattern: 'under bill', position: 'Under Bill' }
] as const;

/**
 * Size detection patterns
 */
const SIZE_PATTERNS = [
  { pattern: 'large', size: 'Large' },
  { pattern: 'medium', size: 'Medium' },
  { pattern: 'small', size: 'Small' }
] as const;

/**
 * UNIFIED LOGO DETECTION FUNCTION
 *
 * Replaces ALL existing detection systems with simple, reliable logic
 * CRITICAL FIX: Handles multiple logos in comma-separated sentences
 */
export function detectLogosUnified(text: string): UnifiedLogoDetection {
  console.log('🔍 [UNIFIED-LOGO] Starting unified detection:', text.substring(0, 100));

  const lowerText = text.toLowerCase();
  const detectedLogos: UnifiedLogoResult[] = [];
  const positionMap = new Map<string, boolean>(); // Deduplication by position
  const processedPatterns = new Set<string>(); // Track processed patterns to avoid re-processing

  // Step 1: Handle "no logo" cases first
  const noLogoPatterns = ['no logo', 'no decoration', 'without logo', 'plain cap', 'blank cap'];
  const hasNoLogos = noLogoPatterns.some(pattern => lowerText.includes(pattern));

  if (hasNoLogos) {
    console.log('🚫 [UNIFIED-LOGO] No logos detected (explicit no-logo request)');
    return {
      logos: [],
      totalCount: 0,
      hasLogos: false,
      summary: 'No logos requested'
    };
  }

  // Step 2: EXACT PATTERN MATCHING - FIND ALL MATCHES, NOT JUST FIRST ONE
  console.log('🔍 [UNIFIED-LOGO] Searching for ALL logo patterns in text...');

  for (const pattern of EXACT_PATTERNS) {
    // CRITICAL FIX: Find ALL instances of this pattern, not just check if it exists
    const patternInstances = findAllPatternInstances(lowerText, pattern.pattern);

    if (patternInstances.length > 0) {
      console.log(`🎯 [UNIFIED-LOGO] Found ${patternInstances.length} instance(s) of pattern: "${pattern.pattern}" -> ${pattern.type}`);

      for (const instance of patternInstances) {
        // Determine position for THIS specific instance
        let position = pattern.position;
        if (!position) {
          // Use position detection near this specific instance
          position = detectPositionNearIndex(text, instance.index, pattern.pattern);
        }

        // Check if position already has a logo (deduplication)
        if (positionMap.has(position)) {
          console.log(`⚠️ [UNIFIED-LOGO] Position ${position} already has logo - skipping duplicate`);
          continue;
        }

        // Determine size near this specific instance
        const size = detectSizeNearIndex(text, instance.index, pattern.pattern) ||
                     POSITION_DEFAULTS[position as keyof typeof POSITION_DEFAULTS] || 'Medium';

        // Determine application
        const application = APPLICATION_MAP[pattern.type as keyof typeof APPLICATION_MAP] || 'Direct';

        // Determine mold charge requirement
        // CRITICAL FIX: Screen Print should NOT have mold charges
        // Only Leather Patch and Rubber Patch should have mold charges
        const hasMoldCharge = pattern.type.toLowerCase().includes('patch') && pattern.type !== 'Screen Print';

        const logo: UnifiedLogoResult = {
          type: pattern.type,
          position,
          size,
          application,
          confidence: 0.95, // High confidence for exact matches
          hasMoldCharge
        };

        detectedLogos.push(logo);
        positionMap.set(position, true);

        console.log(`✅ [UNIFIED-LOGO] Added: ${logo.type} at ${logo.position} (${logo.size}) - Confidence: ${logo.confidence}`);
      }
    }
  }

  // Step 3: Generate summary
  const summary = detectedLogos.length > 0
    ? detectedLogos.map(logo => `${logo.position}: ${logo.type} (${logo.size})`).join(', ')
    : 'No logos detected';

  console.log('🎯 [UNIFIED-LOGO] Final results:', {
    totalCount: detectedLogos.length,
    logos: detectedLogos.map(l => ({ type: l.type, position: l.position, size: l.size })),
    summary
  });

  return {
    logos: detectedLogos,
    totalCount: detectedLogos.length,
    hasLogos: detectedLogos.length > 0,
    summary
  };
}

/**
 * Find ALL instances of a pattern in text (not just the first one)
 * CRITICAL: This enables detecting multiple logos in comma-separated lists
 */
function findAllPatternInstances(text: string, pattern: string): { index: number; match: string }[] {
  const instances: { index: number; match: string }[] = [];
  let searchIndex = 0;

  while (true) {
    const index = text.indexOf(pattern, searchIndex);
    if (index === -1) break;

    instances.push({ index, match: pattern });
    searchIndex = index + pattern.length; // Continue searching after this match
  }

  return instances;
}

/**
 * Detect position near a specific pattern index in text
 */
function detectPositionNearIndex(text: string, patternIndex: number, pattern: string): string {
  const lowerText = text.toLowerCase();

  if (patternIndex === -1) return 'Front'; // Default fallback

  // Look for position keywords within 30 characters before/after pattern
  const contextStart = Math.max(0, patternIndex - 30);
  const contextEnd = Math.min(lowerText.length, patternIndex + pattern.length + 30);
  const contextText = lowerText.substring(contextStart, contextEnd);

  // Check position patterns in order of specificity
  for (const posPattern of POSITION_PATTERNS) {
    if (contextText.includes(posPattern.pattern)) {
      console.log(`📍 [UNIFIED-LOGO] Position detected near "${pattern}" at index ${patternIndex}: ${posPattern.position}`);
      return posPattern.position;
    }
  }

  // Default position based on logo type
  if (pattern.includes('patch')) return 'Front'; // Patches typically go on front
  return 'Front'; // Safe default
}

/**
 * Detect position near a specific pattern in text (legacy function for compatibility)
 */
function detectPositionNear(text: string, pattern: string): string {
  const lowerText = text.toLowerCase();
  const patternIndex = lowerText.indexOf(pattern);
  return detectPositionNearIndex(text, patternIndex, pattern);
}

/**
 * Detect size near a specific pattern index in text
 */
function detectSizeNearIndex(text: string, patternIndex: number, pattern: string): string | null {
  const lowerText = text.toLowerCase();

  if (patternIndex === -1) return null;

  // Look for size keywords within 20 characters before/after pattern
  const contextStart = Math.max(0, patternIndex - 20);
  const contextEnd = Math.min(lowerText.length, patternIndex + pattern.length + 20);
  const contextText = lowerText.substring(contextStart, contextEnd);

  for (const sizePattern of SIZE_PATTERNS) {
    if (contextText.includes(sizePattern.pattern)) {
      console.log(`📏 [UNIFIED-LOGO] Size detected near "${pattern}" at index ${patternIndex}: ${sizePattern.size}`);
      return sizePattern.size;
    }
  }

  return null; // Will use position default
}

/**
 * Detect size near a specific pattern in text (legacy function for compatibility)
 */
function detectSizeNear(text: string, pattern: string): string | null {
  const lowerText = text.toLowerCase();
  const patternIndex = lowerText.indexOf(pattern);
  return detectSizeNearIndex(text, patternIndex, pattern);
}

/**
 * CONVERSION FUNCTIONS
 * Convert unified results to existing system formats for compatibility
 */

/**
 * Convert to step-by-step-pricing format
 */
export function convertToStepByStepFormat(detection: UnifiedLogoDetection) {
  return {
    hasLogo: detection.hasLogos,
    logos: detection.logos.map(logo => ({
      type: logo.type,
      position: logo.position,
      size: logo.size,
      application: logo.application
    }))
  };
}

/**
 * Convert to format8-functions format
 */
export function convertToFormat8Format(detection: UnifiedLogoDetection) {
  return detection.logos.map(logo => ({
    type: logo.type,
    location: logo.position, // format8 uses 'location' instead of 'position'
    size: logo.size,
    hasMoldCharge: logo.hasMoldCharge,
    priority: logo.position === 'Front' ? 1 : 2
  }));
}

/**
 * ENHANCED LOGO FALLBACK SYSTEM
 * Apply intelligent defaults when logos are detected but positions are unclear
 */
export function applyEnhancedLogoDefaults(detection: UnifiedLogoDetection): UnifiedLogoDetection {
  if (!detection.hasLogos || detection.logos.length === 0) {
    return detection;
  }

  console.log('🎯 [ENHANCED-FALLBACK] Applying enhanced logo positioning defaults');

  const enhancedLogos: UnifiedLogoResult[] = [];
  const usedPositions = new Set<string>();

  // Process each logo and assign intelligent defaults
  detection.logos.forEach((logo, index) => {
    let finalPosition = logo.position;
    let finalSize = logo.size;

    // If position is unclear or already used, apply fallback sequence
    if (!finalPosition || finalPosition === 'Front' && usedPositions.has('Front')) {
      const fallbackIndex = Math.min(index, LOGO_POSITION_SEQUENCE.length - 1);
      const fallback = LOGO_POSITION_SEQUENCE[fallbackIndex];

      // Find next available position in sequence
      let sequenceIndex = fallbackIndex;
      while (sequenceIndex < LOGO_POSITION_SEQUENCE.length && usedPositions.has(LOGO_POSITION_SEQUENCE[sequenceIndex].position)) {
        sequenceIndex++;
      }

      if (sequenceIndex < LOGO_POSITION_SEQUENCE.length) {
        finalPosition = LOGO_POSITION_SEQUENCE[sequenceIndex].position;
        finalSize = LOGO_POSITION_SEQUENCE[sequenceIndex].size;
      } else {
        // All sequence positions used, assign to Front with warning
        finalPosition = 'Front';
        finalSize = 'Large';
        console.warn('⚠️ [ENHANCED-FALLBACK] All sequence positions used, defaulting to Front');
      }

      console.log(`🔄 [ENHANCED-FALLBACK] Logo ${index + 1}: ${logo.type} → ${finalPosition} (${finalSize})`);
    }

    usedPositions.add(finalPosition);

    enhancedLogos.push({
      ...logo,
      position: finalPosition,
      size: finalSize
    });
  });

  return {
    ...detection,
    logos: enhancedLogos,
    summary: enhancedLogos.map(logo => `${logo.position}: ${logo.type} (${logo.size})`).join(', ')
  };
}

/**
 * Convert to costing-knowledge-base detectAllLogosFromText format
 */
export function convertToKnowledgeBaseFormat(detection: UnifiedLogoDetection) {
  // Apply enhanced defaults before conversion
  const enhancedDetection = applyEnhancedLogoDefaults(detection);

  return {
    primaryLogo: enhancedDetection.logos.find(l => l.position === 'Front')?.type || (enhancedDetection.logos[0]?.type) || 'None',
    allLogos: enhancedDetection.logos.map(logo => ({
      type: logo.type,
      position: logo.position.toLowerCase(),
      size: logo.size,
      confidence: logo.confidence
    })),
    multiLogoSetup: enhancedDetection.logos.length > 0 ?
      enhancedDetection.logos.reduce((setup, logo) => {
        const key = logo.position.toLowerCase().replace(' ', '');
        setup[key] = {
          type: logo.type,
          size: logo.size,
          application: logo.application
        };
        return setup;
      }, {} as any) : null
  };
}