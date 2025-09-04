import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: '62anct3y',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { sectionType, sectionId } = body;

    // First, get the current page
    const page = await client.getDocument(params.id);
    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // If sectionId is provided, reference the existing section
    // Otherwise, create a new section reference
    let sectionReference;
    if (sectionId) {
      sectionReference = {
        _type: 'reference',
        _ref: sectionId,
      };
    } else {
      // Create a new section based on type
      let newSection;
      switch (sectionType) {
        case 'heroSection':
          newSection = await client.create({
            _type: 'heroSection',
            title: 'New Hero Section',
            headline: 'Welcome to our page',
            isVisible: true,
          });
          break;
        case 'productSection':
          newSection = await client.create({
            _type: 'productSection',
            title: 'New Product Section',
            headline: 'Our Products',
            isVisible: true,
          });
          break;
        case 'testimonialSection':
          newSection = await client.create({
            _type: 'testimonialSection',
            title: 'New Testimonial Section',
            headline: 'What our customers say',
            isVisible: true,
          });
          break;
        case 'contactSection':
          newSection = await client.create({
            _type: 'contactSection',
            title: 'New Contact Section',
            headline: 'Get in touch',
            isVisible: true,
          });
          break;
        default:
          throw new Error(`Unknown section type: ${sectionType}`);
      }
      sectionReference = {
        _type: 'reference',
        _ref: newSection._id,
      };
    }

    // Add the section to the page
    const currentSections = page.sections || [];
    const updatedSections = [...currentSections, sectionReference];

    const result = await client
      .patch(params.id)
      .set({ sections: updatedSections })
      .commit();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding section to page:', error);
    return NextResponse.json(
      { error: 'Failed to add section to page' },
      { status: 500 }
    );
  }
}
