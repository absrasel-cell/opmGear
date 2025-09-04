import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: '62anct3y',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const query = `*[_type == "page" && _id == $id][0] {
      _id,
      title,
      slug,
      description,
      isHomePage,
      isPublished,
      sections[] {
        _type,
        title,
        headline,
        isVisible
      },
      createdAt,
      updatedAt
    }`;

    const page = await client.fetch(query, { id: params.id });

    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, slug, description, isHomePage, isPublished, sections } = body;

    // Prepare the update object
    const updateDoc: any = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updateDoc.title = title;
    if (slug !== undefined) updateDoc.slug = { _type: 'slug', current: slug };
    if (description !== undefined) updateDoc.description = description;
    if (isHomePage !== undefined) updateDoc.isHomePage = isHomePage;
    if (isPublished !== undefined) updateDoc.isPublished = isPublished;
    if (sections !== undefined) updateDoc.sections = sections;

    const result = await client
      .patch(params.id)
      .set(updateDoc)
      .commit();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await client.delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}
