import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
 const dbUrl = process.env.DATABASE_URL;
 
 return NextResponse.json({
  hasDatabaseUrl: !!dbUrl,
  databaseUrlLength: dbUrl?.length || 0,
  databaseUrlStart: dbUrl?.substring(0, 50) || 'N/A',
  databaseUrlEnd: dbUrl?.substring(dbUrl.length - 20) || 'N/A',
  // Don't log the full URL for security
 });
}
