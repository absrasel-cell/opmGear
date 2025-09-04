'use client';
import { useState, useEffect } from 'react';

export default function CmsDemoPage() {
 const [customizationPricings, setCustomizationPricings] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [errorMessage, setErrorMessage] = useState('');

 useEffect(() => {
  async function fetchData() {
   try {
    const response = await fetch('/api/test-webflow');
    if (!response.ok) {
     throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    setCustomizationPricings(data.customizationPricings || []);
   } catch (error) {
    console.warn('Failed to fetch Webflow data:', error);
    setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
   } finally {
    setLoading(false);
   }
  }
  fetchData();
 }, []);

 // You can fetch others similarly
 // const blankCapPricings = await fetchWebflowCollection('689af13ab391444ed2a11577');
 // const productOptions = await fetchWebflowCollection('689aeb2e2148dc453aa7e652');
 // const logoDecorations = await fetchWebflowCollection('689ae87add9894b4cba681d3');
 // const customerProducts = await fetchWebflowCollection('689ae21c87c9aa3cb52a434c');

 if (loading) {
  return (
   <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
    <div className="text-center">
     <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
     <p className="text-gray-600">Loading Webflow data...</p>
    </div>
   </div>
  );
 }

 return (
  <div className="min-h-screen bg-gray-100 p-8">
   <h1 className="text-4xl font-bold mb-6 text-center">OPM Gear CMS Demo (from Webflow)</h1>
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {customizationPricings && customizationPricings.length > 0 ? (
     customizationPricings.map((item: { id: string; name?: string; price?: number }) => (
      <div key={item.id} className="bg-white p-4 rounded-lg shadow-md">
       <h2 className="text-2xl font-semibold">{item.name || 'Unnamed Item'}</h2>
       <p className="text-gray-600">Price: ${item.price || 'N/A'}</p>
       <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Add to Cart
       </button>
      </div>
     ))
    ) : (
     <div className="col-span-full text-center py-8">
      <p className="text-gray-500 text-lg">No CMS data available at the moment.</p>
      <p className="text-sm text-gray-400 mt-2">
       This could be due to Webflow API configuration or connectivity issues.
      </p>
      {errorMessage && (
       <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
         <strong>Debug info:</strong> {errorMessage}
        </p>
       </div>
      )}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-left max-w-md mx-auto">
       <p className="text-sm text-blue-800 font-semibold">Expected Environment Variables:</p>
       <ul className="text-xs text-blue-700 mt-2 space-y-1">
        <li>• WEBFLOW_API_TOKEN</li>
        <li>• WEBFLOW_SITE_ID</li>
        <li>• WEBFLOW_CUSTOMIZATION_PRICING_COLLECTION_ID</li>
       </ul>
      </div>
     </div>
    )}
   </div>
  </div>
 );
}