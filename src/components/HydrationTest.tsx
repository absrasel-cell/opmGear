'use client';

import { useState, useEffect } from 'react';

export default function HydrationTest() {
  const [isClient, setIsClient] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    console.log('🧪 HydrationTest: useEffect executed - hydration successful!');
    setIsClient(true);
  }, []);

  const handleClick = () => {
    console.log('🖱️ HydrationTest: Button clicked - client-side JavaScript working!');
    setClickCount(prev => prev + 1);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50">
      <div className="text-sm font-medium">Hydration Test</div>
      <div className="text-xs">
        Status: {isClient ? '✅ Hydrated' : '⏳ Loading...'}
      </div>
      <button 
        onClick={handleClick}
        className="mt-2 px-3 py-1 bg-white text-green-600 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
      >
        Click Test ({clickCount})
      </button>
      <div className="text-xs mt-1">
        {isClient ? 'Client-side JS working!' : 'Server-side render only'}
      </div>
    </div>
  );
}