import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: '62anct3y',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { fromIndex, toIndex } = body;

    // Get the current page
    const page = await client.getDocument(params.id);
    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    const currentSections = page.sections || [];
    
    if (fromIndex < 0 || fromIndex >= currentSections.length ||
        toIndex < 0 || toIndex >= currentSections.length) {
      return NextResponse.json(
        { error: 'Invalid section index' },
        { status: 400 }
      );
    }

    // Reorder the sections
    const updatedSections = [...currentSections];
    const [movedSection] = updatedSections.splice(fromIndex, 1);
    updatedSections.splice(toIndex, 0, movedSection);

    const result = await client
      .patch(params.id)
      .set({ sections: updatedSections })
      .commit();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reordering sections:', error);
    return NextResponse.json(
      { error: 'Failed to reorder sections' },
      { status: 500 }
    );
  }
}
