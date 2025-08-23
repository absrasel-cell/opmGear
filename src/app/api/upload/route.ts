import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request received');
    
    // Check Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      console.error('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'Missing Supabase configuration'
      }, { status: 500 });
    }
    
    let user;
    try {
      user = await getCurrentUser(request);
    } catch (authError) {
      console.log('No authentication found, proceeding as guest');
    }

    // If no user, generate a guest identifier for file naming
    const userId = user?.id || `guest_${Date.now()}`;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('No file in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', file.name, file.size, file.type);

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size);
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
    }

    // Validate file type - include common logo file formats
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'application/illustrator', 'application/postscript', 
      'image/eps', 'text/plain'
    ];
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed formats: PNG, JPG, GIF, WEBP, SVG, PDF, AI, EPS, TXT' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}_${timestamp}.${fileExtension}`;

    console.log('Attempting to upload to Supabase:', fileName);

    // Upload directly to the uploads bucket (we know it exists)

    // Upload to Supabase Storage
    let uploadData;
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('uploads')
        .upload(`messages/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return NextResponse.json({ 
          error: 'Failed to upload file',
          details: error.message 
        }, { status: 500 });
      }

      uploadData = data;
      console.log('File uploaded successfully:', data);
    } catch (uploadError) {
      console.error('Upload operation error:', uploadError);
      return NextResponse.json({ 
        error: 'Upload operation failed',
        details: uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
      }, { status: 500 });
    }

    // Get public URL
    let urlData;
    try {
      const { data: urlResult } = supabaseAdmin.storage
        .from('uploads')
        .getPublicUrl(`messages/${fileName}`);

      urlData = urlResult;
      console.log('Public URL generated:', urlData.publicUrl);
    } catch (urlError) {
      console.error('Error generating public URL:', urlError);
      return NextResponse.json({ 
        error: 'Failed to generate public URL',
        details: urlError instanceof Error ? urlError.message : 'Unknown URL error'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file: {
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        category: file.type.startsWith('image/') ? 'image' : 'document'
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
