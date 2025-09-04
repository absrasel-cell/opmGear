// src/app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
 try {
  // Get the secret token from query params or headers
  const secret = request.nextUrl.searchParams.get('secret') || request.headers.get('x-secret');
  
  // Check for secret token to ensure only authorized requests can revalidate
  if (secret !== process.env.REVALIDATE_SECRET) {
   return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  // Revalidate all Webflow CMS data
  revalidateTag('webflow-cms');
  
  return NextResponse.json({ 
   revalidated: true, 
   message: 'Webflow CMS cache revalidated successfully',
   timestamp: new Date().toISOString()
  });
 } catch (err) {
  return NextResponse.json({ 
   error: 'Error revalidating cache',
   details: err instanceof Error ? err.message : 'Unknown error'
  }, { status: 500 });
 }
}

export async function GET(request: NextRequest) {
 return NextResponse.json({ 
  message: 'Cache revalidation endpoint. Use POST method with secret parameter.',
  usage: 'POST /api/revalidate?secret=YOUR_SECRET'
 });
}
