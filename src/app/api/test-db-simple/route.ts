import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL is not set'
      });
    }

    // Extract host for debugging (without exposing credentials)
    const urlParts = databaseUrl.split('@');
    const hostPart = urlParts[1] || 'unknown';
    const host = hostPart.split('/')[0];
    
    return NextResponse.json({
      success: true,
      databaseUrlExists: true,
      host: host,
      hasCredentials: urlParts.length > 1,
      // Don't expose the actual URL for security
    });

  } catch (error: any) {
    console.error('Database connection test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
      },
      { status: 500 }
    );
  }
}
