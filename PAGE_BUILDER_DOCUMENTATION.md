# Page Builder Documentation

## Overview

The Page Builder is a comprehensive visual page creation and management system integrated into your admin dashboard. It allows you to create, edit, and manage website pages using Sanity CMS as the backend, with a user-friendly interface for non-technical users.

## Features

### 🎯 Core Features
- **Visual Page Editor**: Drag-and-drop interface for creating pages
- **Section Management**: Add, remove, and reorder page sections
- **Real-time Preview**: See changes as you make them
- **Sanity CMS Integration**: Full integration with your existing Sanity setup
- **Responsive Design**: Works on desktop and mobile devices
- **SEO Management**: Built-in SEO fields for each page

### 📄 Page Types
- **Hero Sections**: Banner areas with headlines, descriptions, and call-to-action buttons
- **Product Sections**: Display products in various layouts (grid, list, carousel, masonry)
- **Testimonial Sections**: Customer reviews and testimonials
- **Contact Sections**: Contact forms and information

### 🎨 Section Features
- **Background Colors**: Choose from predefined colors or custom colors
- **Layout Options**: Multiple layout styles for each section type
- **Visibility Controls**: Show/hide sections as needed
- **Responsive Settings**: Configure how sections appear on different devices

## Getting Started

### 1. Access the Page Builder

1. Log into your admin dashboard
2. Navigate to the "Page Builder" tab
3. You'll see a list of existing pages and options to create new ones

### 2. Create a New Page

1. Click "Create New Page" button
2. Fill in the basic information:
   - **Page Title**: The name of your page
   - **URL Slug**: The URL path (e.g., "about-us" for /about-us)
   - **Description**: Brief description for SEO
   - **Home Page**: Check if this should be your homepage
3. Click "Create Page"

### 3. Add Sections

1. Select a page from the list
2. Click "Edit Page" to enter edit mode
3. Click "Add Section" to add new sections
4. Choose from available section types:
   - **Hero Section**: Main banner area
   - **Product Section**: Display products
   - **Testimonial Section**: Customer reviews
   - **Contact Section**: Contact information and forms

### 4. Configure Sections

Each section type has specific configuration options:

#### Hero Section
- **Headline**: Main title text
- **Subheadline**: Secondary title
- **Description**: Detailed description
- **Background Image**: Upload or select an image
- **Background Color**: Choose color scheme
- **Call-to-Action Buttons**: Add up to 3 buttons with links

#### Product Section
- **Headline**: Section title
- **Layout**: Grid, List, Carousel, or Masonry
- **Columns**: Number of columns (1-4)
- **Show Prices**: Toggle price display
- **Show Descriptions**: Toggle product descriptions
- **Show Add to Cart**: Toggle cart buttons

#### Testimonial Section
- **Headline**: Section title
- **Layout**: Grid, Carousel, or List
- **Columns**: Number of columns (1-3)
- **Testimonials**: Add customer reviews with ratings

#### Contact Section
- **Headline**: Section title
- **Layout**: Side by Side, Stacked, Form Only, or Info Only
- **Contact Information**: Email, phone, address, hours
- **Contact Form**: Configure form fields and settings

### 5. Preview and Publish

1. Use the "Preview Mode" button to see how your page looks
2. Make adjustments as needed
3. Set the page to "Published" when ready
4. Your page will be live on your website

## API Endpoints

The Page Builder uses several API endpoints for data management:

### Pages
- `GET /api/sanity/pages` - Fetch all pages
- `POST /api/sanity/pages` - Create a new page
- `GET /api/sanity/pages/[id]` - Fetch a specific page
- `PATCH /api/sanity/pages/[id]` - Update a page
- `DELETE /api/sanity/pages/[id]` - Delete a page

### Sections
- `GET /api/sanity/sections` - Fetch all sections
- `POST /api/sanity/sections` - Create a new section
- `POST /api/sanity/pages/[id]/sections` - Add section to page
- `DELETE /api/sanity/pages/[id]/sections/[index]` - Remove section from page
- `PATCH /api/sanity/pages/[id]/sections/reorder` - Reorder sections

## Sanity Schema

The Page Builder uses custom Sanity schemas for content management:

### Page Schema
```typescript
{
  _type: 'page',
  title: string,
  slug: { current: string },
  description?: string,
  isHomePage: boolean,
  isPublished: boolean,
  sections: Section[],
  seo: {
    metaTitle?: string,
    metaDescription?: string,
    ogImage?: image
  }
}
```

### Section Schemas
Each section type has its own schema with specific fields for that section's functionality.

## Customization

### Adding New Section Types

1. Create a new schema file in `src/sanity/schemaTypes/sections/`
2. Add the schema to `src/sanity/schemaTypes/index.ts`
3. Update the Page Builder component to handle the new section type
4. Add corresponding API endpoints if needed

### Styling Customization

The Page Builder uses Tailwind CSS classes. You can customize:
- Colors by modifying the color options in section schemas
- Layouts by adding new layout options
- Components by updating the UI components in `src/components/ui/`

## Best Practices

### Content Management
- Use descriptive page titles and URLs
- Write compelling headlines for sections
- Optimize images for web use
- Include relevant meta descriptions for SEO

### Performance
- Keep sections focused and concise
- Use appropriate image sizes
- Limit the number of sections per page
- Enable caching for published pages

### User Experience
- Test pages on different devices
- Ensure fast loading times
- Make navigation intuitive
- Use consistent styling across pages

## Troubleshooting

### Common Issues

1. **Sections not saving**: Check your Sanity API token configuration
2. **Images not uploading**: Verify Sanity image asset permissions
3. **Preview not working**: Ensure all required fields are filled
4. **Page not publishing**: Check that the page is marked as published

### Debug Mode

Enable debug mode by checking the browser console for detailed error messages and API responses.

## Support

For technical support or feature requests:
1. Check the Sanity documentation for CMS-related issues
2. Review the API endpoints for data management issues
3. Contact your development team for customizations

## Future Enhancements

Planned features for future releases:
- **Drag-and-Drop Interface**: Visual section reordering
- **Template System**: Pre-built page templates
- **Version Control**: Page version history
- **Advanced SEO**: More comprehensive SEO tools
- **Analytics Integration**: Page performance tracking
- **Multi-language Support**: Internationalization features
