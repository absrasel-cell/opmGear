import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const client = createClient({
 projectId: '62anct3y',
 dataset: 'production',
 apiVersion: '2024-01-01',
 useCdn: false,
 token: process.env.SANITY_API_TOKEN,
});

export async function DELETE(
 request: NextRequest,
 { params }: { params: { id: string; index: string } }
) {
 try {
  const sectionIndex = parseInt(params.index);
  
  // Get the current page
  const page = await client.getDocument(params.id);
  if (!page) {
   return NextResponse.json(
    { error: 'Page not found' },
    { status: 404 }
   );
  }

  const currentSections = page.sections || [];
  
  if (sectionIndex < 0 || sectionIndex >= currentSections.length) {
   return NextResponse.json(
    { error: 'Invalid section index' },
    { status: 400 }
   );
  }

  // Remove the section at the specified index
  const updatedSections = currentSections.filter((_, index) => index !== sectionIndex);

  const result = await client
   .patch(params.id)
   .set({ sections: updatedSections })
   .commit();

  return NextResponse.json(result);
 } catch (error) {
  console.error('Error removing section from page:', error);
  return NextResponse.json(
   { error: 'Failed to remove section from page' },
   { status: 500 }
  );
 }
}
