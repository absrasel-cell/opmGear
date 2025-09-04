"use client";

import React, { useState, useEffect } from 'react';

interface ShippingBuild {
  buildNumber: string;
  status: string;
  shippingMethod: string;
  estimatedDeparture: string | null;
}

const ShippingBuildDisplay: React.FC = () => {
  const [shippingBuild, setShippingBuild] = useState<ShippingBuild | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShippingBuild = async () => {
      try {
        const response = await fetch('/api/shipments/current-build');
        const data = await response.json();
        
        if (data.success && data.shipment) {
          setShippingBuild(data.shipment);
        }
      } catch (error) {
        console.error('Error fetching shipping build:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShippingBuild();
  }, []);

  if (loading || !shippingBuild) {
    return null; // Don't show anything if no shipping build is available
  }

  return (
    <div className="flex items-center gap-2">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="w-4 h-4 text-blue-500" 
        style={{ strokeWidth: 1.5 }}
      >
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path>
        <path d="M15 18H9"></path>
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path>
        <circle cx="17" cy="18" r="2"></circle>
        <circle cx="7" cy="18" r="2"></circle>
      </svg>
      <span className="text-sm font-medium font-sans">
        Build #{shippingBuild.buildNumber}
      </span>
    </div>
  );
};

export default ShippingBuildDisplay;