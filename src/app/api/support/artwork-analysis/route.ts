import { NextRequest, NextResponse } from 'next/server';
import { ArtworkAnalysisService } from '@/lib/ai/artwork-analysis-service';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
 try {
  console.log('🎨 Artwork Analysis API called');
  
  // Parse multipart form data
  const formData = await request.formData();
  const artworkFile = formData.get('artwork') as File;
  const userId = formData.get('userId') as string;
  const sessionId = formData.get('sessionId') as string;

  if (!artworkFile) {
   return NextResponse.json(
    { error: 'No artwork file provided' },
    { status: 400 }
   );
  }

  // Validate file type - accept images and PDFs
  const acceptedTypes = [
   'image/jpeg',
   'image/jpg',
   'image/png', 
   'image/gif',
   'image/webp',
   'image/svg+xml',
   'image/bmp',
   'image/tiff',
   'application/pdf'
  ];
  
  if (!acceptedTypes.includes(artworkFile.type)) {
   return NextResponse.json(
    { error: 'Only image files (JPG, PNG, GIF, WEBP, SVG, BMP, TIFF) and PDF files are allowed' },
    { status: 400 }
   );
  }

  // Convert file to buffer
  const arrayBuffer = await artworkFile.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  console.log('🎨 Processing artwork file:', {
   name: artworkFile.name,
   size: artworkFile.size,
   type: artworkFile.type
  });

  // Process with Artwork Analyst AI - handle both images and PDFs
  const analysisResult = artworkFile.type.startsWith('image/') 
   ? await ArtworkAnalysisService.analyzeImageArtwork(fileBuffer, artworkFile.type, {
     userId,
     sessionId,
     includeRawText: false,
     strictValidation: true,
     defaultPanelCount: 6
    })
   : await ArtworkAnalysisService.analyzePDFArtwork(fileBuffer, {
     userId,
     sessionId,
     includeRawText: false,
     strictValidation: true,
     defaultPanelCount: 6
    });

  console.log('✅ Artwork analysis completed:', {
   id: analysisResult.id,
   confidence: analysisResult.confidence,
   status: analysisResult.processingStatus,
   assetsCount: analysisResult.assets.length,
   accessoriesCount: analysisResult.accessories.length
  });

  // Store analysis result in database for reference
  if (userId) {
   try {
    await supabase
     .from('artwork_analyses')
     .insert({
      id: analysisResult.id,
      user_id: userId,
      session_id: sessionId,
      cap_spec: analysisResult.capSpec,
      assets: analysisResult.assets,
      accessories: analysisResult.accessories,
      processing_status: analysisResult.processingStatus,
      confidence: analysisResult.confidence,
      created_at: new Date().toISOString()
     });
   } catch (dbError) {
    console.error('Failed to store analysis in database:', dbError);
    // Don't fail the entire request for DB issues
   }
  }

  return NextResponse.json({
   success: true,
   analysis: analysisResult,
   capCraftFormat: ArtworkAnalysisService.convertToCapCraftFormat(analysisResult)
  });

 } catch (error) {
  console.error('❌ Artwork analysis failed:', error);
  
  return NextResponse.json(
   { 
    error: 'Artwork analysis failed',
    details: error instanceof Error ? error.message : 'Unknown error'
   },
   { status: 500 }
  );
 }
}

export async function GET() {
 return NextResponse.json({ 
  message: 'Artwork Analysis API',
  endpoints: ['POST /api/support/artwork-analysis'],
  description: 'Upload image or PDF artwork files for AI analysis and cap specification extraction'
 });
}