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
 */
const EXACT_PATTERNS: Array<{ pattern: string; type: string; position?: string }> = [
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

  { pattern: 'embroidery on left', type: 'Embroidery', position: 'Left' },
  { pattern: 'embroidery left', type: 'Embroidery', position: 'Left' },
  { pattern: 'embroidery on right', type: 'Embroidery', position: 'Right' },
  { pattern: 'embroidery right', type: 'Embroidery', position: 'Right' },
  { pattern: 'embroidery on front', type: 'Embroidery', position: 'Front' },
  { pattern: 'embroidery front', type: 'Embroidery', position: 'Front' },
  { pattern: 'embroidery on back', type: 'Embroidery', position: 'Back' },
  { pattern: 'embroidery back', type: 'Embroidery', position: 'Back' },

  { pattern: '3d embroidery on left', type: '3D Embroidery', position: 'Left' },
  { pattern: '3d embroidery left', type: '3D Embroidery', position: 'Left' },
  { pattern: 'flat embroidery on right', type: 'Flat Embroidery', position: 'Right' },
  { pattern: 'flat embroidery right', type: 'Flat Embroidery', position: 'Right' },

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
  { pattern: 'sublimated print', type: 'Sublimation' },
  { pattern: 'sublimated', type: 'Sublimation' },
  { pattern: 'sublimation printing', type: 'Sublimation' },
  { pattern: 'sublimation', type: 'Sublimation' },

  // FALLBACK: Generic embroidery (LOWEST PRIORITY - must be last)
  { pattern: 'embroidery', type: 'Embroidery' }
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
 * Convert to costing-knowledge-base detectAllLogosFromText format
 */
export function convertToKnowledgeBaseFormat(detection: UnifiedLogoDetection) {
  return {
    primaryLogo: detection.logos.find(l => l.position === 'Front')?.type || (detection.logos[0]?.type) || 'None',
    allLogos: detection.logos.map(logo => ({
      type: logo.type,
      position: logo.position.toLowerCase(),
      size: logo.size,
      confidence: logo.confidence
    })),
    multiLogoSetup: detection.logos.length > 0 ?
      detection.logos.reduce((setup, logo) => {
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