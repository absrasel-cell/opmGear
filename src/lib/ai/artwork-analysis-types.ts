/**
 * Types for Artwork Analysis Service
 * Handles PDF artwork analysis and cap specification extraction
 */

export interface CapSpecification {
  // Basic Cap Details
  shape: string; // e.g., "Semi Pro Slight Curve Bill"
  billShape: string; // e.g., "Flat", "Slight Curved", "Curved" (CSV standard names)
  fabric: string; // e.g., "Polyester Cotton Mix"
  closure: string; // e.g., "Snapback"
  panelCount: number; // Default to 6 if not specified
  
  // Cap Colors
  frontCrown: string;
  backCrown: string;
  bill: string;
  sandwich?: string;
  underbill: string;
  stitching: string;
}

export interface ArtworkAsset {
  id: string;
  position: string; // e.g., "Front", "Left Side", "Back Center"
  size: {
    height: string; // e.g., "2.4\""
    width: string; // e.g., "Auto", "2.6\""
  };
  color?: string;
  style: string; // e.g., "Emb 3D = Mustard Part, Flat = Black, White Outlines"
  application: string; // e.g., "3D Embroidery"
  description?: string;
}

export interface CapAccessory {
  type: string; // e.g., "Brand Label", "B-Tape Print", "Hang Tag"
  details: string;
  position?: string;
  size?: string;
  color?: string;
}

export interface ArtworkAnalysisResult {
  id: string;
  timestamp: Date;
  
  // Core Cap Specifications
  capSpec: CapSpecification;
  
  // Assets/Logos
  assets: ArtworkAsset[];
  
  // Accessories
  accessories: CapAccessory[];
  
  // Additional Details
  details: string[];
  
  // Processing Status
  processingStatus: 'success' | 'partial' | 'error';
  confidence: number; // 0-1
  
  // Raw extracted text for reference
  rawText?: string;
  
  // AI Analysis Notes
  analysisNotes?: string[];
  warnings?: string[];
}

export interface ArtworkProcessingOptions {
  userId?: string;
  sessionId?: string;
  includeRawText?: boolean;
  strictValidation?: boolean;
  defaultPanelCount?: number;
}