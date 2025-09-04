/**
 * Artwork Analysis Service
 * Processes PDF artwork files and extracts detailed cap specifications
 * Integrates with CapCraft AI for quote generation
 */

import { ArtworkAnalysisResult, CapSpecification, ArtworkAsset, CapAccessory, ArtworkProcessingOptions } from './artwork-analysis-types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class ArtworkAnalysisService {
  
  /**
   * Main method to analyze image artwork and extract cap specifications
   */
  static async analyzeImageArtwork(
    imageBuffer: Buffer,
    mimeType: string,
    options: ArtworkProcessingOptions = {}
  ): Promise<ArtworkAnalysisResult> {
    
    const analysisId = `IA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('🖼️ Starting image artwork analysis...', { analysisId, mimeType });
      
      // Convert image buffer to base64 data URL
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      
      // Process directly with AI vision
      const analysisResult = await this.processImageWithAI(dataUrl, analysisId, options);
      
      return analysisResult;
      
    } catch (error) {
      console.error('❌ Image analysis failed:', error);
      
      return {
        id: analysisId,
        timestamp: new Date(),
        capSpec: this.getDefaultCapSpec(),
        assets: [],
        accessories: [],
        details: [],
        processingStatus: 'error',
        confidence: 0,
        analysisNotes: [`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Main method to analyze PDF artwork and extract cap specifications
   */
  static async analyzePDFArtwork(
    pdfBuffer: Buffer,
    options: ArtworkProcessingOptions = {}
  ): Promise<ArtworkAnalysisResult> {
    
    const analysisId = `AA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('🎨 Starting PDF artwork analysis...', { analysisId });
      
      // Step 1: Extract text and images from PDF
      const extractedData = await this.extractPDFContent(pdfBuffer);
      
      // Step 2: Process with AI to extract structured specifications
      const analysisResult = await this.processWithAI(extractedData, analysisId, options);
      
      return analysisResult;
      
    } catch (error) {
      console.error('❌ PDF analysis failed:', error);
      
      return {
        id: analysisId,
        timestamp: new Date(),
        capSpec: this.getDefaultCapSpec(),
        assets: [],
        accessories: [],
        details: [],
        processingStatus: 'error',
        confidence: 0,
        analysisNotes: [`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Extract content from PDF - Using GPT-4 Vision for direct PDF analysis
   */
  private static async extractPDFContent(pdfBuffer: Buffer): Promise<{
    text: string;
    images: any[];
    metadata: any;
  }> {
    try {
      console.log('📄 Processing PDF with text extraction fallback...');
      console.log('📄 PDF buffer size:', pdfBuffer.length, 'bytes');
      
      // Try PDF text extraction first using pdf-parse
      try {
        const pdfParse = await import('pdf-parse');
        console.log('📄 pdf-parse imported successfully');
        
        const pdfData = await pdfParse.default(pdfBuffer, {
          // Ensure we're using the buffer directly without file system access
          normalizeWhitespace: true,
          max: 0 // No limit on pages
        });
        
        console.log('📄 pdf-parse completed:', {
          textLength: pdfData.text?.length || 0,
          numPages: pdfData.numpages,
          hasText: !!pdfData.text
        });
        
        if (pdfData.text && pdfData.text.length > 50) {
          console.log(`✅ Successfully extracted ${pdfData.text.length} characters of text from PDF`);
          
          return {
            text: pdfData.text,
            images: [],
            metadata: { 
              source: 'pdf-parse-text-extraction',
              pageCount: pdfData.numpages,
              textLength: pdfData.text.length
            }
          };
        } else {
          console.warn('⚠️ PDF text extraction returned insufficient text content');
          throw new Error('No meaningful text content extracted from PDF');
        }
        
      } catch (parseError) {
        console.error('❌ pdf-parse specific error:', parseError);
        throw parseError;
      }
      
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      
      // Try PDF processor for image extraction as backup
      try {
        console.log('📄 Fallback: Trying PDF processor for image extraction...');
        
        // Import PDF processor
        const { PDFProcessor } = await import('./pdf-processor');
        
        // Process PDF and extract images
        const pdfResult = await PDFProcessor.processPDFBuffer(pdfBuffer);
        
        if (pdfResult.success && pdfResult.images && pdfResult.images.length > 0) {
          console.log(`✅ Successfully extracted ${pdfResult.images.length} images from PDF`);
          
          // Use the first extracted image for analysis
          const imageDataUrl = pdfResult.images[0];
          
          console.log('📄 Using GPT-4 Vision to analyze extracted PDF image...');
          
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are a PDF content extractor and visual analyst specialized in custom cap specifications. Extract ALL text content AND perform comprehensive visual element analysis of this PDF document.

🔴 CRITICAL COLOR EXTRACTION REQUIREMENTS:
- Preserve EXACT color names including multi-word colors like "Light Grey", "Dark Grey", "Light Blue", "Carolina Blue", "Kelly Green", "Dark Green", "Burnt Orange", "Light Khaki", "Amber Gold", "Charcoal Grey"
- DO NOT truncate or modify color names 
- DO NOT substitute similar colors (e.g., "Light Grey" is NOT "Black")
- Extract colors exactly as they appear in the document

📍 COMPREHENSIVE VISUAL ANALYSIS REQUIREMENTS:

1. CAP COLOR SPECIFICATIONS:
   - Systematically extract: Front Crown, Back Crown, Bill, Underbill, Stitching, Sandwich colors
   - Preserve exact color terminology from specification text

2. LOGO/ASSET COMPREHENSIVE DETECTION:
   - Scan ALL cap positions for visual elements: Front, Left Side, Right Side, Back Center, Bill, Button
   - For each logo/element found, extract: Position, Size specifications, Application method, Style details
   - Include text elements, letters, symbols, and graphics as logos
   - Don't limit to obvious main logos - scan for ALL visual elements

3. ACCESSORY COMPREHENSIVE ANALYSIS:
   - Systematically check ALL accessory categories: Main Label, Size Label, Brand Label, Hang Tag, B-Tape Print, Care Label
   - For each category, determine if visual content exists beyond "N/A"
   - Include categories with ANY visual elements (graphics, text content, special formatting)
   - Exclude ONLY categories that are explicitly "N/A" with no additional visual content
   - Look for partial content, dimensions, descriptions that indicate visual elements

🔍 DETECTION METHODOLOGY:
- Scan the document systematically, not just obvious sections
- Look for specification tables, detailed breakdowns, technical drawings
- Check for both text specifications AND visual representations
- Include elements that may be partially visible or described
- Be comprehensive - don't miss secondary positions or subtle accessories

Return extracted text with special attention to:
1. Complete color specifications with exact terminology
2. ALL logo positions and their detailed specifications
3. ALL accessory categories with visual content analysis
4. Technical specifications and measurements
5. Application methods and style details`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Please extract all text content from this PDF document with COMPREHENSIVE ANALYSIS. Perform systematic scanning for:

COLOR SPECIFICATIONS: Preserve exact color names like 'Light Grey', 'Dark Grey', 'Light Blue', etc. DO NOT truncate or substitute colors.

LOGO/ASSET DETECTION: Scan ALL cap positions (Front, Left Side, Right Side, Back Center, Bill, Button) for ANY visual elements. Extract position, size, application method, and style details for EACH element found.

ACCESSORY ANALYSIS: Examine ALL accessory categories (Main Label, Size Label, Brand Label, Hang Tag, B-Tape Print, Care Label) and determine which have visual content beyond 'N/A'. Include categories with ANY text, graphics, or specifications.

Be systematic and comprehensive - don't miss secondary logos, side elements, or subtle accessories. Extract ALL technical specifications and measurements.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageDataUrl
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000,
            temperature: 0.1
          });
          
          const extractedText = response.choices[0]?.message?.content || '';
          
          console.log('✅ GPT-4 Vision text extraction completed:', {
            textLength: extractedText.length,
            preview: extractedText.substring(0, 200) + '...'
          });
          
          return {
            text: extractedText,
            images: pdfResult.images,
            metadata: { 
              source: 'pdf-processor-gpt-4-vision-extraction',
              imagesExtracted: pdfResult.images.length,
              pdfMetadata: pdfResult.metadata
            }
          };
        }
      } catch (pdfProcessorError) {
        console.error('PDF processor also failed:', pdfProcessorError);
      }
      
      // If all extraction methods fail, throw error instead of using fallback
      throw new Error('Failed to extract content from PDF - unable to process file');
    }
  }

  /**
   * Process image directly with AI vision to get structured specifications
   */
  private static async processImageWithAI(
    imageDataUrl: string,
    analysisId: string,
    options: ArtworkProcessingOptions
  ): Promise<ArtworkAnalysisResult> {
    
    const systemPrompt = this.buildSystemPrompt();
    const imageAnalysisPrompt = this.buildImageAnalysisPrompt();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: [
            {
              type: "text",
              text: imageAnalysisPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI analysis');
    }

    try {
      const parsed = JSON.parse(aiResponse);
      
      return {
        id: analysisId,
        timestamp: new Date(),
        capSpec: this.validateCapSpec(parsed.capSpec || {}),
        assets: this.validateAssets(parsed.assets || []),
        accessories: this.validateAccessories(parsed.accessories || []),
        details: parsed.details || [],
        processingStatus: this.determineProcessingStatus(parsed.confidence, parsed.assets?.length || 0, parsed.accessories?.length || 0),
        confidence: parsed.confidence || 0.5,
        rawText: undefined, // No raw text for image analysis
        analysisNotes: parsed.analysisNotes || [],
        warnings: parsed.warnings || []
      };
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI analysis response');
    }
  }

  /**
   * Process extracted content with AI to get structured specifications
   */
  private static async processWithAI(
    extractedData: { text: string; images: any[]; metadata: any },
    analysisId: string,
    options: ArtworkProcessingOptions
  ): Promise<ArtworkAnalysisResult> {
    
    // Clean and preprocess the extracted text
    const cleanedText = this.preprocessText(extractedData.text);
    
    const systemPrompt = this.buildSystemPrompt();
    const analysisPrompt = this.buildAnalysisPrompt(cleanedText);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: analysisPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI analysis');
    }

    try {
      const parsed = JSON.parse(aiResponse);
      
      return {
        id: analysisId,
        timestamp: new Date(),
        capSpec: this.validateCapSpec(parsed.capSpec || {}),
        assets: this.validateAssets(parsed.assets || []),
        accessories: this.validateAccessories(parsed.accessories || []),
        details: parsed.details || [],
        processingStatus: this.determineProcessingStatus(parsed.confidence, parsed.assets?.length || 0, parsed.accessories?.length || 0),
        confidence: parsed.confidence || 0.5,
        rawText: options.includeRawText ? extractedData.text : undefined,
        analysisNotes: parsed.analysisNotes || [],
        warnings: parsed.warnings || []
      };
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI analysis response');
    }
  }

  /**
   * Clean and preprocess extracted PDF text
   */
  private static preprocessText(rawText: string): string {
    console.log('🧹 Starting text preprocessing...', {
      originalLength: rawText.length,
      preview: rawText.substring(0, 500)
    });
    
    // Remove excessive Lorem ipsum text but preserve color information
    let cleanText = rawText.replace(/Lorem ipsum(?![\w\s]*(?:Grey|Gray|Black|White|Blue|Red|Green|Brown|Navy|Charcoal))[^.]*\./g, '');
    
    // Clean up extra whitespace and newlines while preserving color context
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    // Extract key sections with improved color-preserving patterns
    const sections = [];
    
    // Enhanced cap specification patterns for comprehensive extraction
    const capSpecPatterns = [
      // Color specifications - comprehensive pattern matching
      /(?:Front Crown|frontcrown|front_crown)[^\n\r]*?[:\-=]\s*([A-Za-z][A-Za-z\s]*)/gi,
      /(?:Back Crown|backcrown|back_crown)[^\n\r]*?[:\-=]\s*([A-Za-z][A-Za-z\s]*)/gi,
      /(?:Bill|bill)[^\n\r]*?[:\-=]\s*([A-Za-z][A-Za-z\s]*)/gi,
      /(?:Underbill|underbill|under_bill)[^\n\r]*?[:\-=]\s*([A-Za-z][A-Za-z\s]*)/gi,
      /(?:Stitching|stitching)[^\n\r]*?[:\-=]\s*([A-Za-z][A-Za-z\s]*)/gi,
      /(?:Sandwich|sandwich)[^\n\r]*?[:\-=]\s*([A-Za-z][A-Za-z\s]*|None|N\/A)/gi,
      
      // Cap structure patterns with broader matching
      /(?:Shape|shape|Profile|profile)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:Fabric|fabric|Material|material)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:Closure|closure|Back|back)[^\n\r]*?[:\-=]\s*(?:Snapback|Velcro|Fitted|Strap)[^\n\r]*/gi,
      
      // Asset and logo patterns - more comprehensive
      /(?:ASSETS USED|Assets Used|assets used)[\s\S]*?(?=ACCESSORIES|Accessories|$)/gi,
      /(?:ASSETS|Assets)[\s\S]*?(?=ACCESSORIES|Accessories|$)/gi,
      /(?:Position|position)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:Size|size)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:Style|style)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:Application|application)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:Height|height|H)[^\n\r]*?[:\-=]\s*([0-9\.\"\s]*)/gi,
      /(?:Width|width|W)[^\n\r]*?[:\-=]\s*([0-9\.\"\s]*|Auto|auto)/gi,
      
      // Logo position and asset detection patterns
      /(?:Front|front)[^\n\r]*?(?:logo|Logo|embroidery|Embroidery)/gi,
      /(?:Left|left)[^\n\r]*?(?:side|Side|panel|Panel|logo|Logo)/gi,
      /(?:Right|right)[^\n\r]*?(?:side|Side|panel|Panel|logo|Logo)/gi,
      /(?:Back|back)[^\n\r]*?(?:center|Center|logo|Logo|script|Script)/gi,
      /(?:Bill|bill|Visor|visor)[^\n\r]*?(?:logo|Logo)/gi,
      
      // Accessory patterns - comprehensive detection
      /(?:ACCESSORIES|Accessories|accessories)[\s\S]*$/gi,
      /(?:Main Label|main label|Brand Label|brand label)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:Size Label|size label|Fitting Label|fitting label)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:Brand Label|brand label|Authenticity|authenticity)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:Hang Tag|hang tag|Tag|tag)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:B-Tape|b-tape|Print|print|Contact|contact)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      /(?:Care Label|care label|Instructions|instructions)[^\n\r]*?[:\-=]\s*([^\n\r]*)/gi,
      
      // Additional asset detection patterns
      /(?:3D|3d)\s*(?:Embroidery|embroidery)/gi,
      /(?:Screen Print|screen print|Print|print)/gi,
      /(?:Embroidery|embroidery)/gi,
      /(?:Patch|patch|Applique|applique)/gi
    ];
    
    capSpecPatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        sections.push(...matches.map(match => match.trim()));
      }
    });
    
    // If we found specific sections, use those; otherwise use the full cleaned text
    const processedText = sections.length > 0 ? sections.join(' ') : cleanText;
    
    // Additional comprehensive color validation - ensure ALL color terms are preserved
    const allColorTerms = [
      // Multi-word colors (critical to preserve)
      'Light Grey', 'Dark Grey', 'Charcoal Grey', 'Light Blue', 'Carolina Blue',
      'Kelly Green', 'Dark Green', 'Burnt Orange', 'Light Khaki', 'Amber Gold',
      // Single word colors
      'White', 'Black', 'Red', 'Cardinal', 'Maroon', 'Khaki', 'Stone',
      'Navy', 'Royal', 'Purple', 'Pink', 'Green', 'Gold', 'Orange', 'Brown', 'Olive',
      // Neon and specialty colors
      'Neon Green', 'Neon Orange', 'Neon Yellow', 'Neon Pink', 'Neon Blue',
      'Realtree', 'MossyOak', 'Kryptek Brown', 'Kryptek Black/Grey',
      'Bottomland Camo', 'Duck Camo', 'Army Camo', 'Digital Camo Grey'
    ];
    
    const preservedColors = allColorTerms.filter(color => 
      processedText.toLowerCase().includes(color.toLowerCase())
    );
    
    console.log('🧹 Text preprocessing completed:', {
      originalLength: rawText.length,
      cleanedLength: cleanText.length,
      sectionsFound: sections.length,
      finalLength: processedText.length,
      preservedColors: preservedColors,
      assetPatternsMatched: sections.filter(s => s.includes('Position') || s.includes('Size') || s.includes('Style')).length,
      accessoryPatternsMatched: sections.filter(s => s.includes('Label') || s.includes('Tag') || s.includes('Print')).length,
      preview: processedText.substring(0, 300)
    });
    
    return processedText;
  }


  /**
   * Build system prompt for AI analysis
   */
  private static buildSystemPrompt(): string {
    return `You are ArtworkAnalyst AI, a specialized system for analyzing custom cap artwork specifications with COMPREHENSIVE DETECTION capabilities.

🎯 COMPREHENSIVE ANALYSIS MISSION:
Your task is to extract ALL design elements and specifications visible in the artwork. While focusing on one consistent cap design for ordering, you must detect and catalog ALL logos, assets, and accessories shown in the specification.

CRITICAL: Scan the ENTIRE artwork thoroughly - don't stop after finding the first few elements. Most cap designs have multiple logos (2-6+) and accessories (3-7+).

🔴 CRITICAL COLOR EXTRACTION REQUIREMENTS:

🎨 CAP COLOR CONFIGURATION LOGIC:
1. SOLID COLOR (1-color): Full cap is one single color
   - All parts (Front Crown, Back Crown, Bill, Underbill, etc.) are the same color
   
2. SPLIT COLOR (2-color): Cap combines two colors following this pattern:
   - Primary Color (Color 1): Front Crown, Upper Bill, Under Bill
   - Secondary Color (Color 2): Side Crowns, Back Crown, Button, Closure
   
3. TRI-COLOR (3-color): Cap combines three colors following this pattern:
   - Color 1: Upper Bill, Under Bill, Button
   - Color 2: Front Crown
   - Color 3: Side Crowns, Back Crown
   - Closure: Matches Button color (Color 1)

1. CAP COLOR SPECIFICATIONS - EXACT COLOR MATCHING:
   You must extract colors EXACTLY as they appear in the document. Pay special attention to:
   
   MULTI-WORD COLORS (DO NOT TRUNCATE):
   - "Light Grey" → Extract as "Light Grey" (NOT "Light" or "Grey")
   - "Dark Grey" → Extract as "Dark Grey" (NOT "Dark" or "Grey")
   - "Charcoal Grey" → Extract as "Charcoal Grey"
   - "Light Blue" → Extract as "Light Blue"
   - "Carolina Blue" → Extract as "Carolina Blue"
   - "Kelly Green" → Extract as "Kelly Green"
   - "Dark Green" → Extract as "Dark Green"
   - "Burnt Orange" → Extract as "Burnt Orange"
   - "Light Khaki" → Extract as "Light Khaki"
   - "Amber Gold" → Extract as "Amber Gold"
   
   COMMON COLOR EXTRACTION ERRORS TO AVOID:
   - DO NOT extract "Light Grey" as "Black"
   - DO NOT extract "Dark Grey" as "Black"
   - DO NOT truncate multi-word color names
   - DO NOT assume similar colors are the same
   
   SUPPORTED COLORS FROM CSV:
   White, Black, Red, Cardinal, Maroon, Amber Gold, Khaki, Light Khaki, Stone, 
   Light Grey, Dark Grey, Charcoal Grey, Navy, Light Blue, Royal, Carolina Blue, 
   Purple, Pink, Green, Kelly Green, Dark Green, Gold, Orange, Burnt Orange, 
   Brown, Olive, plus Neon and Camo variants

2. CAP SPECIFICATIONS:
   - Shape: Look for "Semi Pro Slight Curve Bill" or similar patterns
   - Fabric: Look for "Polyester Cotton Mix" or fabric types
   - Closure: Look for "Snapback", "Velcro", "Fitted", etc.
   - Panel Count: Extract or default to 6
   - Colors: Extract from "Front Crown", "Back Crown", "Bill", "Sandwich", "Underbill", "Stitching" sections
   - Bill Shape: Map PDF variations to CSV standard names (Flat, Slight Curved, Curved)

3. ASSETS/LOGOS - COMPREHENSIVE POSITION SCANNING (Look for "ASSETS USED" section):
   🎯 CRITICAL: A SINGLE cap design typically has MULTIPLE logos across different positions
   
   📍 SYSTEMATIC POSITION SCANNING METHODOLOGY:
   Examine EACH of these positions individually and thoroughly:
   
   PRIMARY POSITIONS (Check each one):
   - Front Crown Center: Main logo, primary emblem, large letter/number
   - Front Crown Left/Right: Offset logos, side emblems, accent elements
   - Left Side Panel: Secondary logos, mascot characters, side graphics
   - Right Side Panel: Mirror logos, different emblems, sponsor marks
   - Back Center Panel: Text logos, school names, script writing
   - Back Left Panel: Small logos, additional elements
   - Back Right Panel: Symmetrical or unique design elements
   
   SECONDARY POSITIONS (Don't overlook):
   - Bill/Visor Top Surface: Logos on the bill exterior
   - Bill/Visor Underside: Undervisor logos or text
   - Button/Crown Top: Small center logos or emblems
   - Closure Area: Logos on snapback or velcro areas
   
   🔍 DETECTION METHODOLOGY FOR EACH POSITION:
   For every position above, systematically check:
   - Is there ANY visual element present? (logo, text, symbol, graphic)
   - What type of element? (emblem, letter, character, symbol, text)
   - What are its characteristics? (size, colors, 3D effects)
   - How is it applied? (embroidery, print, patch, applique)
   
   FOR EACH LOGO/ELEMENT DETECTED:
   - Position: Specific location ("Front Crown", "Left Side Panel", "Right Side Panel", etc.)
   - Size: Dimensions if visible ("Large", "Medium", "Small", or specific measurements)
   - Application: Method of application ("3D Embroidery", "Screen Print", "Flat Embroidery")
   - Style: Visual characteristics ("Raised 3D", "Multi-color", "Outlined", etc.)
   - Description: Generic description of element ("Large letter", "Character figure", "Symbol", "Text script")
   
   ⚠️ COMPREHENSIVE DETECTION EXPECTATIONS:
   - Typical caps have 2-6+ distinct logo elements across different positions
   - Don't stop after finding 1-2 obvious logos - scan ALL positions systematically
   - Include text elements, single letters, numbers, and small symbols as logos
   - Check both obvious and subtle positions (sides, back, bill areas)
   - Each position should be evaluated independently

4. ACCESSORIES - COMPREHENSIVE CATEGORY EXAMINATION (Look for "ACCESSORIES" section):
   🎯 CRITICAL: Check for VISUAL ELEMENTS in ALL accessory categories systematically
   
   📍 SYSTEMATIC ACCESSORY SCANNING METHODOLOGY:
   Examine EACH of these categories individually and thoroughly:
   
   LABEL CATEGORIES (Check each one):
   - Main Label/Brand Tag: Company labels, brand markers, rectangular tags
   - Size Label/Fitting Tag: Size indicators, measurement labels, fitting info
   - Brand Label/Authenticity Tag: Merchandise labels, authenticity markers, quality tags
   - Care Label/Instruction Tag: Washing instructions, fabric content, care symbols
   - Special Labels: Custom tags, unique identifiers, serial markers
   
   TAG CATEGORIES (Don't overlook):
   - Hang Tags: Attached swing tags, promotional tags, information tags
   - Shaped Tags: Diamond tags, circular tags, special shaped markers
   - Promotional Tags: Event tags, limited edition markers, special occasion tags
   
   PRINT CATEGORIES (Often missed):
   - B-Tape Prints: Contact information, website addresses, phone numbers
   - Internal Prints: Inside crown prints, hidden text, internal graphics
   - Accent Prints: Small text elements, decorative prints, subtle markings
   
   🔍 DETECTION METHODOLOGY FOR EACH CATEGORY:
   For every category above, systematically check:
   - Is there ANY visual content beyond "N/A"? (text, graphics, logos, symbols)
   - Are there dimensions or specifications mentioned?
   - Is there descriptive content about appearance or placement?
   - Are there references to visual elements, colors, or formatting?
   
   INCLUSION CRITERIA (Be liberal in detection):
   - Include if ANY text content is mentioned
   - Include if visual elements or graphics are described
   - Include if size, color, or positioning is specified
   - Include if formatting or special characteristics are noted
   - Only exclude if explicitly marked "N/A" with absolutely no additional detail
   
   FOR EACH ACCESSORY DETECTED:
   - Type: Specific category name ("Main Label", "Hang Tag", "B-Tape Print", etc.)
   - Details: Generic description of visual content ("Text element present", "Graphic content", "Label visible")
   - Position: Location if mentioned ("Inside crown", "Back panel", "Attached")
   - Characteristics: Visual attributes if noted ("Rectangular", "Diamond-shaped", "Printed text")
   
   ⚠️ COMPREHENSIVE DETECTION EXPECTATIONS:
   - Typical caps have 3-7+ different accessory types with visual content
   - Many categories have content even if initially appearing as "N/A"
   - Include elements with partial visibility or generic descriptions
   - Check both obvious labels AND subtle printed elements
   - Each category should be evaluated independently for content

COMPREHENSIVE DETECTION METHODOLOGY:
Use these examples as reference for detection thoroughness, but adapt to ANY cap design:
DETECTION EXPECTATIONS FOR ANY CAP DESIGN:

COLOR EXTRACTIONS (Extract exact colors as specified):
- Scan for: "Front Crown: [Color]", "Back Crown: [Color]", "Bill: [Color]" patterns
- Preserve multi-word colors: "Light Grey", "Dark Grey", "Stone", etc.
- Don't substitute similar colors

LOGO EXTRACTIONS (Expect 2-6+ logos across positions):
- Scan positions: Front Crown, Left Side, Right Side, Back Center, Bill, Button
- Extract for each: Position, Size specifications, Application method, Description
- Include text elements, letters, symbols as logos
- Don't stop at 1-2 obvious logos - scan ALL positions

ACCESSORY EXTRACTIONS (Expect 3-7+ accessories with content):
- Scan categories: Main Label, Size Label, Brand Label, Hang Tag, B-Tape Print, Care Label
- Include if ANY visual content exists beyond "N/A"
- Look for text content, graphics, dimensions, specifications
- Include partial or generic descriptions

DETECTION CRITERIA:
- Be systematic: scan each position/category individually
- Be comprehensive: don't miss secondary or subtle elements  
- Be inclusive: include elements with partial visibility
- Only exclude if explicitly "N/A" with no visual content

BILL SHAPE MAPPING (CRITICAL - Map PDF variations to CSV standard names):
- "Flat Bill", "Flat", "Flatbill" → "Flat"
- "Slight Curve Bill", "Slight Curved Bill", "Slight Curved", "Semi Curve", "Light Curve" → "Slight Curved"  
- "Curve Bill", "Curved Bill", "Curved", "Full Curve", "Deep Curve" → "Curved"
- When PDF shows "Semi Pro Slight Curve Bill" → Extract "Slight Curved"
- Remove "Bill" suffix and map base shape name
- Default to "Slight Curved" if bill shape is unclear

CONFIDENCE SCORING (Dynamic based on detection thoroughness):
- 0.95-1.0: COMPREHENSIVE detection (5+ logos across multiple positions, 4+ accessories, accurate colors)
- 0.85-0.94: EXCELLENT detection (4+ logos, 3+ accessories, accurate colors, good position coverage)
- 0.75-0.84: GOOD detection (3+ logos, 2+ accessories, accurate colors, adequate coverage)
- 0.60-0.74: MODERATE detection (2+ logos, 1+ accessories, mostly accurate colors)
- 0.40-0.59: BASIC detection (1-2 logos, minimal accessories, some color accuracy)
- 0.20-0.39: POOR detection (minimal elements found, significant gaps)
- 0.00-0.19: FAILED detection (unable to extract meaningful specifications)

CONFIDENCE ADJUSTMENTS:
- +0.1 for each additional logo beyond 2 (up to +0.3 max)
- +0.1 for each additional accessory beyond 1 (up to +0.2 max)
- +0.1 for comprehensive position coverage (front, sides, back scanned)
- -0.1 for each major cap position not scanned (front, sides, back, bill)
- -0.1 for each obvious accessory category missed (labels, tags, prints)
- -0.2 for color extraction uncertainties or inaccuracies
- -0.3 for single logo detection when multiple positions are visible

Return JSON object:
{
  "capSpec": {
    "shape": "string",
    "billShape": "string", // Must be: "Flat", "Slight Curved", or "Curved"
    "fabric": "string", 
    "closure": "string",
    "panelCount": number,
    "frontCrown": "string", // EXACT COLOR from document
    "backCrown": "string", // EXACT COLOR from document - e.g., "Light Grey"
    "bill": "string", // EXACT COLOR from document
    "sandwich": "string or null",
    "underbill": "string", // EXACT COLOR from document
    "stitching": "string"
  },
  "assets": [
    {
      "id": "asset-1",
      "position": "string",
      "size": {"height": "string", "width": "string"},
      "color": "string",
      "style": "string",
      "application": "string",
      "description": "string"
    }
  ],
  "accessories": [
    {
      "type": "string",
      "details": "string",
      "position": "string or null",
      "size": "string or null"
    }
  ],
  "details": ["string array"],
  "confidence": number,
  "analysisNotes": ["string array"],
  "warnings": ["string array"]
}`;
  }

  /**
   * Build analysis prompt for image analysis
   */
  private static buildImageAnalysisPrompt(): string {
    return `Analyze this artwork image and extract COMPREHENSIVE cap specifications. This artwork may show multiple cap views, variations, or design elements - detect and catalog ALL visible elements thoroughly.

🎯 COMPREHENSIVE DETECTION PRIORITY:
1. SYSTEMATICALLY SCAN ALL CAP POSITIONS for ANY visual elements (logos, text, symbols, graphics)
2. EXAMINE ALL ACCESSORY AREAS for labels, tags, and printed elements
3. If colors are listed in a legend/specification box, use those EXACT colors
4. DETECT EVERY design element shown - most caps have 2-6+ logos and 3-7+ accessories

🔴 CRITICAL COLOR EXTRACTION INSTRUCTIONS:
When extracting colors, look for EXACT color names like:
- "Light Grey" (DO NOT extract as "Black" or "Grey")
- "Dark Grey" (DO NOT truncate to "Grey")
- "Stone" (DO NOT substitute with "Khaki" or "Light Grey")
- "Charcoal Grey", "Carolina Blue", "Kelly Green", "Burnt Orange", etc.
- Preserve multi-word color names exactly as shown

SPECIFIC EXTRACTION TASKS FOR SINGLE ORDER:
1. 🎯 PRIORITY: Find ONE CONSISTENT set of cap color specifications:
   - Front Crown color (from primary design)
   - Back Crown color (from primary design)
   - Bill color (from primary design)
   - Underbill color (from primary design)
   - Stitching color/type
   - Sandwich color (if any)

2. Extract ALL logo/asset details from the cap design:
   🎯 COMPREHENSIVE LOGO DETECTION: Systematically scan EVERY area of the cap for visual elements:
   
   📍 SCAN THESE POSITIONS METHODICALLY:
   - Front Crown Center: Look for main/primary logos, emblems, letters, numbers
   - Front Crown Left/Right: Check for additional small logos or text
   - Left Side Panel: Scan for secondary logos, mascots, characters, symbols
   - Right Side Panel: Look for matching or different logos, emblems, designs
   - Back Center Panel: Check for text logos, school names, script writing
   - Back Left Panel: Look for additional small logos or elements
   - Back Right Panel: Check for symmetrical or unique design elements
   - Bill/Visor Top: Scan for logos on the bill surface
   - Bill/Visor Underside: Check for undervisor logos or text
   - Button/Top: Look for small logos or emblems on the button
   
   🔍 DETECTION METHODOLOGY:
   For each position, ask yourself:
   - Is there ANY visual element here (logo, text, symbol, graphic, emblem)?
   - What type of element is it (logo, text, character, symbol, badge)?
   - What are its visual characteristics (size, colors, style)?
   - How would it be applied (embroidery, print, patch, applique)?
   
   FOR EACH LOGO/ELEMENT DETECTED:
   - Position: Exact location on cap ("Front Crown", "Left Side Panel", "Right Side Panel", "Back Center", etc.)
   - Size information: Estimate dimensions if visible ("Large", "Medium", "Small" or specific measurements)
   - Application type: How it's applied ("3D Embroidery", "Screen Print", "Flat Embroidery", "Patch", "Applique")
   - Style descriptions: Visual characteristics (colors, effects, 3D elements, outlines)
   - Description: What the element shows ("Letter M", "Mascot figure", "Tree symbol", "Script text", "Company logo")
   
   ⚠️ DETECTION EXPECTATIONS:
   - Most caps have 2-6+ logos/elements across different positions
   - Don't stop after finding 1-2 elements - keep scanning all areas
   - Include text elements, letters, numbers, and symbols as logos
   - Look for both large main logos AND small accent elements

3. Extract ALL accessories and labels visible:
   🎯 COMPREHENSIVE ACCESSORY DETECTION: Systematically examine ALL potential accessory areas:
   
   📍 SCAN THESE ACCESSORY CATEGORIES THOROUGHLY:
   - Main Label/Brand Tags: Look for rectangular labels, company tags, brand markers
   - Size Labels: Check for size indicators, fitting labels, measurement tags
   - Brand/Authenticity Labels: Look for merchandise labels, authenticity markers, quality tags
   - Hang Tags: Scan for attached tags, swing tags, special shaped tags (diamond, circular, etc.)
   - Printed Elements: Look for contact info, website addresses, additional text prints
   - Care Labels: Check for washing instructions, fabric content labels
   - Special Tags: Look for unique identifiers, serial tags, custom markers
   
   🔍 ACCESSORY DETECTION CRITERIA:
   For each category, look for:
   - ANY visible tag, label, or printed element
   - Text content (even if partially visible)
   - Graphic elements (logos, symbols, designs)
   - Special shapes (rectangular, diamond, circular tags)
   - Attachment methods (sewn, attached, printed)
   
   FOR EACH ACCESSORY DETECTED:
   - Type: Specific category name ("Main Label", "Size Label", "Brand Label", "Hang Tag", "B-Tape Print")
   - Details: What you can see ("Brand logo present", "Size marking visible", "Text content present")
   - Position: Where it's located if visible ("Inside crown", "Back neck", "Attached to bill")
   - Visual content: Describe what's visible without specific brand/text details
   
   ⚠️ DETECTION EXPECTATIONS:
   - Most caps have 3-7+ different accessory types
   - Include elements even if text is partially visible
   - Look for both obvious labels AND subtle printed elements
   - Check inside areas, back panels, and attachment points

4. Extract ONE set of cap specifications:
   - Shape/Profile information (from primary design)
   - Fabric type
   - Closure type (Snapback, Velcro, Fitted)
   - Bill shape (map to: "Flat", "Slight Curved", or "Curved")
   - Panel count

⚠️ SINGLE ORDER VALIDATION:
- Extract colors for ONE cap configuration only
- Do NOT create multiple cap variations
- Do NOT mix colors from different cap views
- Use color legend/specification text if available
- Default to the most prominent/main cap design shown

🚫 AVOID MULTIPLE ORDERS:
- Do NOT extract multiple color combinations
- Do NOT create separate specs for each cap view
- Do NOT include color variations as different orders
- Focus on ONE primary cap specification only

CONFIDENCE REQUIREMENTS:
- 0.9+ if COMPREHENSIVE detection (4+ logos, 3+ accessories) with accurate colors
- 0.8+ if GOOD detection (3+ logos, 2+ accessories) with accurate colors
- 0.6-0.7 if MODERATE detection (2+ logos) but some missing elements
- 0.4-0.5 if MINIMAL detection (1 logo) with significant gaps
- 0.3- if poor detection or major extraction failures
- Reduce confidence by 0.1 for each major cap area not scanned
- Reduce confidence by 0.1 for each obvious accessory type missed

Return JSON with COMPREHENSIVE detection results. Include ALL logos/assets and accessories found in the artwork - expect 2-6+ assets and 3-7+ accessories for most cap designs.`;
  }

  /**
   * Build analysis prompt for specific document
   */
  private static buildAnalysisPrompt(extractedText: string): string {
    return `Analyze this cap artwork specification document and extract ONE SINGLE cap order specification. IGNORE any Lorem ipsum placeholder text and focus only on the real cap specifications. If the document shows multiple cap variations, extract specifications for ONE primary cap order only.

DOCUMENT TEXT:
${extractedText}

🎯 SINGLE ORDER EXTRACTION PRIORITY:
1. LOOK FOR THE PRIMARY/MAIN cap specification (usually the most detailed or first mentioned)
2. If multiple color combinations are shown, use the MAIN/PRIMARY one specified
3. Focus on ONE consistent color combination, not multiple variations
4. Extract specifications for ONE cap order that a customer would place

🔴 CRITICAL COLOR EXTRACTION INSTRUCTIONS:
When extracting colors, look for EXACT phrases like:
- "Front Crown: Black" → Extract "Black"
- "Back Crown: Light Grey" → Extract "Light Grey" (DO NOT extract as "Black" or "Grey")
- "Bill: Dark Grey" → Extract "Dark Grey" (DO NOT truncate to "Grey")
- "Underbill: Charcoal Grey" → Extract "Charcoal Grey"
- "Front Crown: Stone" → Extract "Stone" (DO NOT substitute with "Khaki")

DO NOT make assumptions about similar colors. "Light Grey" is NOT "Black", "Stone" is NOT "Khaki".

SPECIFIC EXTRACTION TASKS FOR SINGLE ORDER:
1. 🎯 PRIORITY: Find ONE CONSISTENT set of cap color specifications:
   - Front Crown: Look for "Front Crown:" followed by color name
   - Back Crown: Look for "Back Crown:" followed by color name (CRITICAL: "Light Grey" ≠ "Black")
   - Bill: Look for "Bill:" followed by color name
   - Underbill: Look for "Underbill:" followed by color name
   - Stitching: Look for "Stitching:" followed by color/type
   - Sandwich: Look for "Sandwich:" followed by color or "None"

2. Locate the "ASSETS USED" section and extract ALL logo details:
   🎯 COMPREHENSIVE LOGO DETECTION: Systematically examine ALL mentioned positions and assets
   
   📍 SCAN TEXT FOR THESE POSITION INDICATORS:
   - "Position: Front" or "Front Crown" or "Front Logo"
   - "Position: Left" or "Left Side" or "Side Logo" 
   - "Position: Right" or "Right Side" or "Right Panel"
   - "Position: Back" or "Back Center" or "Back Logo"
   - "Position: Bill" or "Bill Logo" or "Visor Logo"
   - "Position: Top" or "Button Logo" or "Crown Top"
   
   🔍 LOGO DETECTION METHODOLOGY:
   For each position mentioned in the text:
   - Look for size specifications ("H: X", "W: X", "Height:", "Width:", "Size:")
   - Check for application methods ("3D Embroidery", "Screen Print", "Flat Embroidery")
   - Find style descriptions (colors, effects, techniques)
   - Extract any descriptive content about the logo
   
   FOR EACH LOGO/ASSET FOUND IN TEXT:
   - Position: Extract the specific location mentioned
   - Size: Extract height and width if provided, or note "Auto"/"Standard" if not specified
   - Application: Extract the method mentioned (embroidery, print, etc.)
   - Style: Extract any color or technique descriptions
   - Description: Summarize what the asset is (generic description without specific content)
   
   ⚠️ DETECTION EXPECTATIONS:
   - Specification documents often list 2-6+ logo positions
   - Each position may have detailed measurements and application specs
   - Don't miss secondary positions like sides, back, or bill areas
   - Include any text elements, letters, or symbols as logos

3. Find the "ACCESSORIES" section and check for visual elements in ALL categories:
   🎯 COMPREHENSIVE ACCESSORY DETECTION: Systematically examine ALL mentioned accessory categories
   
   📍 SCAN TEXT FOR THESE ACCESSORY CATEGORIES:
   - "Main Label" or "Brand Label" or "Company Label"
   - "Size Label" or "Fitting Label" or "Size Tag"
   - "Brand Label" or "Authenticity Label" or "Merchandise Tag" 
   - "Hang Tag" or "Swing Tag" or "Attached Tag"
   - "B-Tape Print" or "Contact Print" or "Info Print"
   - "Care Label" or "Washing Instructions"
   - "Special Tags" or "Custom Labels"
   
   🔍 ACCESSORY DETECTION CRITERIA:
   For each accessory category mentioned:
   - Check if there's content beyond just "N/A" 
   - Look for descriptions of visual elements
   - Check for size, position, or content specifications
   - Note any special formatting or design mentions
   
   FOR EACH ACCESSORY TYPE FOUND:
   - Type: Extract the specific category name from the text
   - Details: Describe what content is mentioned (avoid copying specific brand text)
   - Position: Extract location info if provided
   - Visual content: Note if graphics, logos, or special formatting is mentioned
   
   INCLUSION CRITERIA:
   - Include if ANY visual content is described beyond "N/A"
   - Include if dimensions, colors, or formatting is specified  
   - Include if text content or contact information is mentioned
   - Exclude ONLY if clearly marked as "N/A" with no additional description
   
   ⚠️ DETECTION EXPECTATIONS:
   - Specification documents often detail 3-7+ different accessory types
   - Many categories have content even if initially marked "N/A"
   - Look for detailed descriptions that indicate visual elements
   - Include elements with partial or generic descriptions

4. Extract ONE set of specifications:
   - Shape, fabric, and closure information (from primary design)
   - Bill shape and map to CSV names ("Flat", "Slight Curved", "Curved")
   - Position, size, and style details for each logo

⚠️ SINGLE ORDER VALIDATION:
- Extract colors for ONE cap configuration only
- Do NOT create multiple cap variations
- Do NOT mix colors from different specifications
- Use the most prominent/primary specification shown
- Focus on ONE primary cap order only

🚫 AVOID MULTIPLE ORDERS:
- Do NOT extract multiple color combinations
- Do NOT create separate specs for different cap views
- Do NOT include color variations as different orders

⚠️ COLOR VALIDATION:
Before finalizing your extraction, double-check that:
- Multi-word colors are preserved ("Light Grey", "Dark Grey", "Carolina Blue", etc.)
- Colors match the supported CSV list exactly
- No color substitutions have been made (e.g., "Light Grey" becoming "Black")
- You're extracting ONE consistent color set, not multiple variations

CONFIDENCE REQUIREMENTS:
- Set confidence to 0.9+ if COMPREHENSIVE detection (4+ logos, 3+ accessories) with accurate colors
- Set confidence to 0.8+ if GOOD detection (3+ logos, 2+ accessories) with accurate colors
- Set confidence to 0.6-0.7 if MODERATE detection (2+ logos) but some missing elements
- Set confidence to 0.4-0.5 if MINIMAL detection (1 logo) with significant gaps
- Set confidence to 0.3- if poor detection or major extraction failures
- REDUCE confidence by 0.1 for each obvious logo position not extracted from text
- REDUCE confidence by 0.1 for each accessory category with content but not detected
- REDUCE confidence by 0.2 if color extractions seem uncertain

Return JSON with COMPREHENSIVE detection results. Include ALL logos/assets and accessories found in the document - expect 2-6+ assets and 3-7+ accessories for most cap designs.`;
  }

  /**
   * Validate and clean cap specifications
   */
  private static validateCapSpec(capSpec: any): CapSpecification {
    // Map bill shape variations to CSV standard names
    let billShape = capSpec.billShape || capSpec.shape || 'Slight Curved';
    
    // Remove "Bill" suffix and normalize
    billShape = billShape.replace(/\s+Bill$/i, '').trim();
    
    // Apply bill shape mapping with more comprehensive patterns
    const lowerShape = billShape.toLowerCase();
    if (lowerShape.includes('flat')) {
      billShape = 'Flat';
    } else if (lowerShape.includes('slight') || lowerShape.includes('semi') || lowerShape.includes('light')) {
      billShape = 'Slight Curved';
    } else if (lowerShape.includes('curve') || lowerShape.includes('curved')) {
      billShape = 'Curved';
    } else {
      billShape = 'Slight Curved'; // Default
    }
    
    // Validate colors against supported CSV colors
    const supportedColors = [
      'White', 'Black', 'Red', 'Cardinal', 'Maroon', 'Amber Gold', 'Khaki', 'Light Khaki', 
      'Stone', 'Light Grey', 'Dark Grey', 'Charcoal Grey', 'Navy', 'Light Blue', 'Royal', 
      'Carolina Blue', 'Purple', 'Pink', 'Green', 'Kelly Green', 'Dark Green', 'Gold', 
      'Orange', 'Burnt Orange', 'Brown', 'Olive', 'Neon Green', 'Neon Orange', 'Neon Yellow', 
      'Neon Pink', 'Neon Blue', 'Realtree', 'MossyOak', 'Kryptek Brown', 'Kryptek Black/Grey', 
      'Prym 1', 'Bottomland Camo', 'Duck Camo', 'Army Camo', 'Digital Camo Grey'
    ];
    
    const validateColor = (color: string, fieldName: string): string => {
      if (!color) return 'Black'; // Default
      
      // Check for exact match (case-insensitive)
      const exactMatch = supportedColors.find(c => c.toLowerCase() === color.toLowerCase());
      if (exactMatch) return exactMatch;
      
      console.warn(`⚠️ Color validation warning: "${color}" for ${fieldName} not found in supported colors. Using as-is.`);
      return color; // Keep original if not found in supported list
    };
    
    return {
      shape: capSpec.shape || 'Semi Pro Slight Curve Bill',
      billShape: billShape,
      fabric: capSpec.fabric || 'Polyester Cotton Mix',
      closure: capSpec.closure || 'Snapback',
      panelCount: capSpec.panelCount || 6,
      frontCrown: validateColor(capSpec.frontCrown, 'frontCrown'),
      backCrown: validateColor(capSpec.backCrown, 'backCrown'),
      bill: validateColor(capSpec.bill, 'bill'),
      sandwich: capSpec.sandwich || null,
      underbill: validateColor(capSpec.underbill, 'underbill'),
      stitching: capSpec.stitching || 'Matching'
    };
  }

  /**
   * Validate and clean assets array
   */
  private static validateAssets(assets: any[]): ArtworkAsset[] {
    return assets.map((asset, index) => ({
      id: asset.id || `asset-${index + 1}`,
      position: asset.position || 'Front',
      size: {
        height: asset.size?.height || 'Auto',
        width: asset.size?.width || 'Auto'
      },
      color: asset.color || 'Multi-color',
      style: asset.style || 'Embroidery',
      application: asset.application || '3D Embroidery',
      description: asset.description || ''
    }));
  }

  /**
   * Validate and clean accessories array
   */
  private static validateAccessories(accessories: any[]): CapAccessory[] {
    return accessories.map(accessory => ({
      type: accessory.type || 'Accessory',
      details: accessory.details || 'N/A',
      position: accessory.position || null,
      size: accessory.size || null,
      color: accessory.color || null
    }));
  }

  /**
   * Determine processing status based on confidence and detection counts
   */
  private static determineProcessingStatus(confidence: number, assetsCount: number, accessoriesCount: number): 'success' | 'partial' | 'error' {
    // Error if very low confidence or no meaningful detection
    if (confidence < 0.2 || (assetsCount === 0 && accessoriesCount === 0)) {
      return 'error';
    }
    
    // Success if comprehensive detection with good confidence
    if (confidence >= 0.8 && assetsCount >= 2 && accessoriesCount >= 2) {
      return 'success';
    }
    
    // Success if high confidence with any meaningful detection
    if (confidence >= 0.85 && (assetsCount >= 1 || accessoriesCount >= 1)) {
      return 'success';
    }
    
    // Success if good confidence with multiple elements detected
    if (confidence >= 0.75 && (assetsCount >= 2 || accessoriesCount >= 2)) {
      return 'success';
    }
    
    // Partial if moderate confidence or some meaningful detection
    if (confidence >= 0.4 && (assetsCount > 0 || accessoriesCount > 0)) {
      return 'partial';
    }
    
    // Error for poor confidence with minimal detection
    return 'error';
  }

  /**
   * Get default cap specification
   */
  private static getDefaultCapSpec(): CapSpecification {
    return {
      shape: 'Semi Pro Slight Curve Bill',
      fabric: 'Polyester Cotton Mix',
      closure: 'Snapback',
      panelCount: 6,
      frontCrown: 'Black',
      backCrown: 'Black',
      bill: 'Black',
      sandwich: null,
      underbill: 'Black',
      stitching: 'Matching'
    };
  }

  /**
   * Convert analysis result to CapCraft AI compatible format
   */
  static convertToCapCraftFormat(analysisResult: ArtworkAnalysisResult): any {
    return {
      capStyle: {
        size: 'One Size', // Default
        color: {
          frontCrown: analysisResult.capSpec.frontCrown,
          backCrown: analysisResult.capSpec.backCrown,
          bill: analysisResult.capSpec.bill,
          underbill: analysisResult.capSpec.underbill
        },
        profile: analysisResult.capSpec.shape,
        shape: analysisResult.capSpec.shape,
        structure: `${analysisResult.capSpec.panelCount}-Panel`,
        fabric: analysisResult.capSpec.fabric,
        stitch: analysisResult.capSpec.stitching
      },
      customization: {
        logos: analysisResult.assets.map(asset => ({
          position: asset.position.toLowerCase().replace(' ', '_'),
          size: asset.size,
          application: asset.application,
          style: asset.style,
          description: asset.description
        })),
        accessories: analysisResult.accessories
      },
      delivery: {
        leadTime: 'Standard', // Default
        quantity: 48 // Default minimum
      },
      source: 'artwork-analysis',
      analysisId: analysisResult.id,
      confidence: analysisResult.confidence
    };
  }
}