import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const client = createClient({
 projectId: '62anct3y',
 dataset: 'production',
 apiVersion: '2024-01-01',
 useCdn: false,
 token: process.env.SANITY_API_TOKEN,
});

export async function GET() {
 try {
  const query = `*[_type == "page"] {
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
  } | order(createdAt desc)`;

  const pages = await client.fetch(query);

  return NextResponse.json({ pages });
 } catch (error) {
  console.error('Error fetching pages:', error);
  return NextResponse.json(
   { error: 'Failed to fetch pages' },
   { status: 500 }
  );
 }
}

export async function POST(request: NextRequest) {
 try {
  const body = await request.json();
  const { title, slug, description, isHomePage, isPublished, sections } = body;

  // Create the page document
  const pageDoc = {
   _type: 'page',
   title,
   slug: {
    _type: 'slug',
    current: slug,
   },
   description,
   isHomePage: isHomePage || false,
   isPublished: isPublished || false,
   sections: sections || [],
   createdAt: new Date().toISOString(),
   updatedAt: new Date().toISOString(),
  };

  const result = await client.create(pageDoc);

  return NextResponse.json(result);
 } catch (error) {
  console.error('Error creating page:', error);
  return NextResponse.json(
   { error: 'Failed to create page' },
   { status: 500 }
  );
 }
}
