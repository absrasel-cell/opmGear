import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
 try {
  console.log('Test upload endpoint accessed');
  
  return NextResponse.json({
   success: true,
   message: 'Upload endpoint is accessible',
   timestamp: new Date().toISOString()
  });
 } catch (error) {
  console.error('Test upload error:', error);
  return NextResponse.json({ 
   error: 'Test failed',
   details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
 }
}

export async function POST(request: NextRequest) {
 try {
  console.log('Test upload POST request received');
  
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
   return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  console.log('Test file received:', file.name, file.size, file.type);

  return NextResponse.json({
   success: true,
   message: 'Test upload request processed successfully',
   file: {
    name: file.name,
    size: file.size,
    type: file.type
   }
  });
 } catch (error) {
  console.error('Test upload POST error:', error);
  return NextResponse.json({ 
   error: 'Test upload failed',
   details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
 }
}
