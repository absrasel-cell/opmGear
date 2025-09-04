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
    // Fetch all section types
    const heroSectionsQuery = `*[_type == "heroSection"] {
      _id,
      _type,
      title,
      headline,
      isVisible
    }`;

    const productSectionsQuery = `*[_type == "productSection"] {
      _id,
      _type,
      title,
      headline,
      isVisible
    }`;

    const testimonialSectionsQuery = `*[_type == "testimonialSection"] {
      _id,
      _type,
      title,
      headline,
      isVisible
    }`;

    const contactSectionsQuery = `*[_type == "contactSection"] {
      _id,
      _type,
      title,
      headline,
      isVisible
    }`;

    const [heroSections, productSections, testimonialSections, contactSections] = await Promise.all([
      client.fetch(heroSectionsQuery),
      client.fetch(productSectionsQuery),
      client.fetch(testimonialSectionsQuery),
      client.fetch(contactSectionsQuery),
    ]);

    const sections = [
      ...heroSections,
      ...productSections,
      ...testimonialSections,
      ...contactSections,
    ];

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectionType, ...sectionData } = body;

    const sectionDoc: any = {
      ...sectionData,
      isVisible: sectionData.isVisible !== undefined ? sectionData.isVisible : true,
    };

    let result;
    switch (sectionType) {
      case 'heroSection':
        result = await client.create({
          _type: 'heroSection',
          ...sectionDoc,
        });
        break;
      case 'productSection':
        result = await client.create({
          _type: 'productSection',
          ...sectionDoc,
        });
        break;
      case 'testimonialSection':
        result = await client.create({
          _type: 'testimonialSection',
          ...sectionDoc,
        });
        break;
      case 'contactSection':
        result = await client.create({
          _type: 'contactSection',
          ...sectionDoc,
        });
        break;
      default:
        throw new Error(`Unknown section type: ${sectionType}`);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    );
  }
}
