// app/cms-demo/page.tsx
import { fetchWebflowCollection } from '../lib/webflow'; // Adjust path if needed

export default async function CmsDemoPage() {
  // Fetch data from one collection (e.g., Customization Pricings)
  let customizationPricings: any[] = [];
  
  try {
    customizationPricings = await fetchWebflowCollection('689af530c2a73c3343f29447');
  } catch (error) {
    console.warn('Failed to fetch Webflow data:', error);
    // Use fallback data or empty array for build to succeed
    customizationPricings = [];
  }

  // You can fetch others similarly
  // const blankCapPricings = await fetchWebflowCollection('689af13ab391444ed2a11577');
  // const productOptions = await fetchWebflowCollection('689aeb2e2148dc453aa7e652');
  // const logoDecorations = await fetchWebflowCollection('689ae87add9894b4cba681d3');
  // const customerProducts = await fetchWebflowCollection('689ae21c87c9aa3cb52a434c');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-6 text-center">OPM Gear CMS Demo (from Webflow)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customizationPricings && customizationPricings.length > 0 ? (
          customizationPricings.map((item: { id: string; name?: string; price?: number }) => (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold">{item.name || 'Unnamed Item'}</h2>
              <p className="text-gray-600">Price: ${item.price || 'N/A'}</p>
              {/* Add more fields based on your CMS schema, e.g., item.description */}
              <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Add to Cart
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500 text-lg">No CMS data available at the moment.</p>
            <p className="text-sm text-gray-400 mt-2">This could be due to Webflow API configuration or connectivity issues.</p>
          </div>
        )}
      </div>
    </div>
  );
}