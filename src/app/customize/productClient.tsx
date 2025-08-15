
// src/app/customize/[slug]/ProductClient.tsx
'use client';

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";

interface Pricing {
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
}

interface CostBreakdown {
  baseProductCost: number;
  logoSetupCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
    details: string;
  }>;
  accessoriesCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  closureCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  deliveryCosts: Array<{
    name: string;
    cost: number;
    unitPrice: number;
  }>;
  totalCost: number;
  totalUnits: number;
}

interface ImageWithAlt {
  url: string;
  alt: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  choices: Array<{
    value: string;
    label: string;
    image?: string;
  }>;
}

interface Product {
  name: string;
  description: string;
  mainImage: ImageWithAlt;
  itemData: ImageWithAlt[];
  frontColorImages: ImageWithAlt[];
  leftColorImages: ImageWithAlt[];
  rightColorImages: ImageWithAlt[];
  backColorImages: ImageWithAlt[];
  capColorImage: ImageWithAlt[];
  splitColorOptions: ImageWithAlt[];
  triColorOptions: ImageWithAlt[];
  camoColorOption: ImageWithAlt[];
  pricing: Pricing;
  productOptions: ProductOption[];
}

function getImageForView(viewList: ImageWithAlt[], colorName: string): ImageWithAlt | null {
  // Try to match by name first, then by alt text as fallback
  return viewList.find((img) => img.name === colorName || img.alt === colorName) || null;
}

// CostCalculator Component
function CostCalculator({ 
  selectedColors,
  logoSetupSelections, 
  multiSelectOptions, 
  selectedOptions, 
  productPricing 
}: {
  selectedColors: Record<string, { sizes: Record<string, number> }>;
  logoSetupSelections: Record<string, { position?: string; size?: string; application?: string }>;
  multiSelectOptions: Record<string, string[]>;
  selectedOptions: Record<string, string>;
  productPricing: Pricing;
}) {
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate cost whenever dependencies change
  useEffect(() => {
    const calculateCost = async () => {
      if (Object.keys(selectedColors).length === 0) {
        setCostBreakdown(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/calculate-cost', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            selectedColors,
            logoSetupSelections,
            multiSelectOptions,
            selectedOptions,
            baseProductPricing: productPricing,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to calculate cost');
        }

        const data = await response.json();
        setCostBreakdown(data);
      } catch (err) {
        console.error('Error calculating cost:', err);
        setError('Failed to calculate cost. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    calculateCost();
  }, [selectedColors, logoSetupSelections, multiSelectOptions, selectedOptions, productPricing]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">!</span>
          </div>
          <span className="text-sm font-medium text-red-800 dark:text-red-200">{error}</span>
        </div>
      </div>
    );
  }

  if (!costBreakdown) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <span className="text-2xl">💰</span>
        </div>
        <p className="text-sm">Select colors to see cost calculation</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Base Product Cost */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Base Product Cost</h4>
        <div className="space-y-2">
          {Object.entries(selectedColors).map(([colorName, colorData]) => {
            const colorTotalQuantity = Object.values(colorData.sizes).reduce((sum, qty) => sum + qty, 0);
            const totalQuantity = Object.values(selectedColors).reduce((sum, colorData) => 
              sum + Object.values(colorData.sizes).reduce((colorSum, qty) => colorSum + qty, 0), 0
            );
            
            let unitPrice = productPricing.price48;
            if (totalQuantity >= 10000) unitPrice = productPricing.price10000;
            else if (totalQuantity >= 2880) unitPrice = productPricing.price2880;
            else if (totalQuantity >= 1152) unitPrice = productPricing.price1152;
            else if (totalQuantity >= 576) unitPrice = productPricing.price576;
            else if (totalQuantity >= 144) unitPrice = productPricing.price144;
            
            const lineTotal = colorTotalQuantity * unitPrice;
            
            return (
              <div key={colorName} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {colorName} × {colorTotalQuantity}
                </span>
                <div className="text-right">
                  <span className="text-gray-500 dark:text-gray-400">${unitPrice.toFixed(2)} each</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    ${lineTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logo Setup Costs */}
      {costBreakdown.logoSetupCosts.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Logo Setup Costs</h4>
          <div className="space-y-2">
            {costBreakdown.logoSetupCosts.map((logoCost, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <div className="text-gray-700 dark:text-gray-300">
                  <div>{logoCost.name} × {costBreakdown.totalUnits}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {logoCost.details}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 dark:text-gray-400">${logoCost.unitPrice.toFixed(2)} each</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    ${logoCost.cost.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accessories Costs */}
      {costBreakdown.accessoriesCosts.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Accessories</h4>
          <div className="space-y-2">
            {costBreakdown.accessoriesCosts.map((accessoryCost, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {accessoryCost.name} × {costBreakdown.totalUnits}
                </span>
                <div className="text-right">
                  <span className="text-gray-500 dark:text-gray-400">${accessoryCost.unitPrice.toFixed(2)} each</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    ${accessoryCost.cost.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closure Type Costs */}
      {costBreakdown.closureCosts.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Closure Type</h4>
          <div className="space-y-2">
            {costBreakdown.closureCosts.map((closureCost, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {closureCost.name} × {costBreakdown.totalUnits}
                </span>
                <div className="text-right">
                  <span className="text-gray-500 dark:text-gray-400">${closureCost.unitPrice.toFixed(2)} each</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    ${closureCost.cost.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Costs */}
      {costBreakdown.deliveryCosts.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Delivery</h4>
          <div className="space-y-2">
            {costBreakdown.deliveryCosts.map((deliveryCost, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {deliveryCost.name} × {costBreakdown.totalUnits}
                </span>
                <div className="text-right">
                  <span className="text-gray-500 dark:text-gray-400">${deliveryCost.unitPrice.toFixed(2)} each</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    ${deliveryCost.cost.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total Cost */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Cost</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${costBreakdown.totalCost.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {costBreakdown.totalUnits} total units
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductClient({ product }: { product: Product }) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedColors, setSelectedColors] = useState<Record<string, { sizes: Record<string, number> }>>({}); // Color name -> { sizes: { sizeValue: quantity } }
  const [mainImage, setMainImage] = useState<ImageWithAlt>(product.mainImage);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [logoSetupSelections, setLogoSetupSelections] = useState<Record<string, {
    position?: string;
    size?: string;
    application?: string;
  }>>({}); // Logo choice value -> sub-options
  const [multiSelectOptions, setMultiSelectOptions] = useState<Record<string, string[]>>({}); // Option slug -> selected values
  const [showOptionalOptions, setShowOptionalOptions] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Steps for guided experience
  const steps = [
    { id: 1, title: 'Choose Colors & Sizes', description: 'Select colors and sizes with quantities', completed: Object.keys(selectedColors).length > 0 },
    { id: 2, title: 'Customize Options', description: 'Configure logos and accessories', completed: (multiSelectOptions['logo-setup'] || []).length > 0 },
    { id: 3, title: 'Add Services', description: 'Choose delivery and services', completed: showOptionalOptions }
  ];

  // Helpers for Cap Style defaults
  function getDefaultBillShapeFromProductName(name: string): string {
    if (name.toLowerCase().includes('slight curved')) return 'Slight Curved';
    if (name.toLowerCase().includes('curved')) return 'Curved';
    return 'Flat';
  }

  // Logo Setup Constants
  const logoPositions = ['Front', 'Left', 'Right', 'Back', 'Upper Bill', 'Under Bill', 'Velcro'];
  const logoSizes = ['Large', 'Medium', 'Small'];
  const logoApplications = ['Run', 'Satin', 'Direct'];
  const quantityOptions = [48, 144, 576, 1152, 2880, 5760, 11520, 23040, 46080];

  // Logo defaults based on position and decoration type
  const getDefaultLogoSize = (position: string) => position === 'Front' ? 'Large' : 'Small';
  const getDefaultApplication = (decorationType: string) => {
    const typeMap: Record<string, string> = {
      '3D Embroidery': 'Direct',
      'Flat Embroidery': 'Direct', 
      'Leather Patch': 'Run',
      'Rubber Patch': 'Run',
      'Printed Patch': 'Satin',
      'Sublimated Patch': 'Satin',
      'Woven Patch': 'Satin'
    };
    return typeMap[decorationType] || 'Direct';
  };

  // Logo position preset order
  const logoPositionOrder = ['Front', 'Back', 'Left', 'Right', 'Upper Bill', 'Under Bill'];
  
  // Get next available position for logo
  const getNextAvailablePosition = (excludeLogoValue?: string) => {
    const usedPositions = Object.entries(logoSetupSelections)
      .filter(([key, config]) => key !== excludeLogoValue && config.position)
      .map(([, config]) => config.position);
    
    return logoPositionOrder.find(pos => !usedPositions.includes(pos)) || '';
  };

  // Helper functions for color-size selection
  const handleColorSelection = (colorName: string) => {
    const isSelected = selectedColors.hasOwnProperty(colorName);
    
    if (isSelected) {
      // Remove color and all its sizes
      setSelectedColors(prev => {
        const newColors = { ...prev };
        delete newColors[colorName];
        return newColors;
      });
    } else {
      // Add color with default Medium size and quantity
      setSelectedColors(prev => ({
        ...prev,
        [colorName]: {
          sizes: { 'medium': 48 } // Default to Medium size with 48 quantity
        }
      }));
    }
  };

  const handleSizeSelectionForColor = (colorName: string, sizeValue: string) => {
    const colorData = selectedColors[colorName];
    if (!colorData) return;

    const isSelected = colorData.sizes.hasOwnProperty(sizeValue);
    
    if (isSelected) {
      // Remove size from this color
      setSelectedColors(prev => ({
        ...prev,
        [colorName]: {
          sizes: Object.fromEntries(
            Object.entries(prev[colorName].sizes).filter(([key]) => key !== sizeValue)
          )
        }
      }));
    } else {
      // Add size to this color with default quantity
      setSelectedColors(prev => ({
        ...prev,
        [colorName]: {
          sizes: {
            ...prev[colorName].sizes,
            [sizeValue]: 48
          }
        }
      }));
    }
  };

  const updateSizeQuantityForColor = (colorName: string, sizeValue: string, quantity: number | string, enforceMinimum: boolean = false) => {
    // Handle empty string or invalid input during typing
    if (quantity === '' || quantity === null || quantity === undefined) {
      // Set to 0 to indicate empty state (will show empty input)
      setSelectedColors(prev => ({
        ...prev,
        [colorName]: {
          sizes: {
            ...prev[colorName].sizes,
            [sizeValue]: 0
          }
        }
      }));
      return;
    }
    
    const numQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;
    
    // Allow any valid number during typing, but enforce minimum when requested
    if (!isNaN(numQuantity)) {
      if (enforceMinimum && numQuantity < 48) {
        // Enforce minimum value
        setSelectedColors(prev => ({
          ...prev,
          [colorName]: {
            sizes: {
              ...prev[colorName].sizes,
              [sizeValue]: 48
            }
          }
        }));
      } else if (numQuantity >= 0) {
        // Allow any non-negative value during typing
        setSelectedColors(prev => ({
          ...prev,
          [colorName]: {
            sizes: {
              ...prev[colorName].sizes,
              [sizeValue]: numQuantity
            }
          }
        }));
      }
    }
  };

  // Helper functions for multi-select
  const toggleMultiSelect = (optionSlug: string, value: string) => {
    setMultiSelectOptions(prev => {
      const current = prev[optionSlug] || [];
      const newSelection = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [optionSlug]: newSelection };
    });
    
    // Auto-assign position for logo setup
    if (optionSlug === 'logo-setup') {
      const current = multiSelectOptions[optionSlug] || [];
      const isAdding = !current.includes(value);
      
      if (isAdding) {
        // Add logo with auto-assigned position
        const nextPosition = getNextAvailablePosition();
        if (nextPosition) {
          setLogoSetupSelections(prev => ({
            ...prev,
            [value]: {
              position: nextPosition,
              size: getDefaultLogoSize(nextPosition),
              application: getDefaultApplication(value)
            }
          }));
        }
      } else {
        // Remove logo and free up its position
        setLogoSetupSelections(prev => {
          const newSelections = { ...prev };
          delete newSelections[value];
          return newSelections;
        });
      }
    }
  };









  const colorTypes: Record<string, ImageWithAlt[]> = {
    Solid: product.capColorImage,
    Split: product.splitColorOptions,
    Tri: product.triColorOptions,
    Camo: product.camoColorOption,
  };

  // Get all unique colors from all available types
  const getAllColors = (): ImageWithAlt[] => {
    const allColors: ImageWithAlt[] = [];
    Object.values(colorTypes).forEach(typeImages => {
      typeImages.forEach(img => {
        if (!allColors.find(existing => existing.name === img.name)) {
          allColors.push(img);
        }
      });
    });
    return allColors;
  };

  const availableTypes = Object.keys(colorTypes).filter((type) => colorTypes[type].length > 0);
  
  // Add "All" option if there are multiple types available
  const typeOptions = useMemo(() => 
    availableTypes.length > 1 ? ['All', ...availableTypes] : availableTypes,
    [availableTypes]
  );

  // Set default color type in useEffect to avoid rendering issues
  useEffect(() => {
    if (typeOptions.length > 0 && !selectedType) {
      setSelectedType(typeOptions[0]);
    }
  }, [typeOptions, selectedType]);

  // Initialize default option values
  useEffect(() => {
    const defaultOptions: Record<string, string> = {};
    const defaultMultiSelect: Record<string, string[]> = {};
    
    product.productOptions.forEach((option) => {
      // Set defaults for single-select options
      if (option.slug === 'logo-setup') {
        defaultOptions[option.slug] = 'Blank';
      } else if (option.slug === 'delivery-type') {
        const regularChoice = option.choices.find(c => c.label.toLowerCase() === 'regular');
        defaultOptions[option.slug] = regularChoice?.value || option.choices[0]?.value || '';
      }
      
      // Set defaults for multi-select options
      if (option.slug === 'accessories' || option.slug === 'services') {
        defaultMultiSelect[option.slug] = [];
      }
      
      // Cap Style Setup defaults (if present in CMS)
      if (option.slug === 'bill-shape') {
        const desired = getDefaultBillShapeFromProductName(product.name);
        const match = option.choices.find(c => c.label.toLowerCase() === desired.toLowerCase());
        defaultOptions[option.slug] = match?.value || option.choices[0]?.value || '';
      }
      if (option.slug === 'profile') {
        const desired = 'Mid';
        const match = option.choices.find(c => c.label.toLowerCase() === desired.toLowerCase());
        defaultOptions[option.slug] = match?.value || option.choices[0]?.value || '';
      }
      if (option.slug === 'closure-type') {
        const desired = 'Snapback';
        const match = option.choices.find(c => c.label.toLowerCase() === desired.toLowerCase());
        defaultOptions[option.slug] = match?.value || option.choices[0]?.value || '';
      }
      if (option.slug === 'structure') {
        const desired = 'Structured';
        const match = option.choices.find(c => c.label.toLowerCase() === desired.toLowerCase());
        defaultOptions[option.slug] = match?.value || option.choices[0]?.value || '';
      }
    });
    
    setSelectedOptions(defaultOptions);
    setMultiSelectOptions(defaultMultiSelect);
  }, [product.productOptions]);

  // Helpers to read product options by slug
  const getOptionBySlug = (slug: string) => product.productOptions.find(o => o.slug === slug);
  const getSelectedOrDefaultLabel = (slug: string, fallbackLabel: string): string => {
    const opt = getOptionBySlug(slug);
    if (!opt || opt.choices.length === 0) return fallbackLabel;
    const selectedValue = selectedOptions[slug];
    const selected = opt.choices.find(c => c.value === selectedValue);
    if (selected) return selected.label;
    const match = opt.choices.find(c => c.label.toLowerCase() === fallbackLabel.toLowerCase());
    return match?.label || opt.choices[0].label;
  };

  // Repeater images: Show itemData if no color selected, else show view-specific images for first selected color
  const firstSelectedColor = Object.keys(selectedColors)[0];
  const repeaterImages = firstSelectedColor
    ? [
        getImageForView(product.frontColorImages, firstSelectedColor),
        getImageForView(product.leftColorImages, firstSelectedColor),
        getImageForView(product.rightColorImages, firstSelectedColor),
        getImageForView(product.backColorImages, firstSelectedColor),
      ].filter((img): img is ImageWithAlt => img !== null)
    : product.itemData;

  // Main image should always show from Main Image field
  useEffect(() => {
    setMainImage(product.mainImage);
  }, [product.mainImage]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Customize Your Cap</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Step {Math.min(currentStep, steps.length)} of {steps.length}
          </span>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-4 min-w-0 flex-shrink-0">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    step.completed
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                      : currentStep === step.id
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/20'
                      : currentStep > step.id
                      ? 'bg-gray-400 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {step.completed ? '✓' : step.id}
                </div>
                <div className="mt-2 text-center min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{step.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 transition-all duration-300 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Product Images */}
        <div className="lg:col-span-1 space-y-6">
          {/* Main Product Image */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="relative h-[400px] rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <Image
            src={mainImage.url}
            alt={mainImage.alt}
            fill
                className="object-contain transition-all duration-300 hover:scale-105"
            priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px"
              />
              <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-1">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {firstSelectedColor || 'Default View'}
                </span>
              </div>
            </div>
        </div>
          {/* Product Views Gallery */}
        {repeaterImages.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {firstSelectedColor ? `${firstSelectedColor} Views` : 'Product Views'}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {repeaterImages.length} images
                </span>
              </div>
                            <div className="grid grid-cols-2 gap-3">
                {repeaterImages.map((img, index) => {
                  const viewLabels = firstSelectedColor ? ['Front', 'Left', 'Right', 'Back'] : [];
                  const viewLabel = firstSelectedColor && viewLabels[index] ? viewLabels[index] : `View ${index + 1}`;
                  
                  return (
            <div
              key={`repeater-${index}`}
                    className={`relative rounded-lg overflow-hidden cursor-pointer group transition-all duration-200 ${
                      mainImage.url === img.url 
                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800' 
                        : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-gray-800'
                    }`}
              onClick={() => setMainImage(img)}
              role="button"
                    aria-label={`View ${img.alt} - ${viewLabel}`}
            >
                    <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
              <Image
                src={img.url}
                alt={img.alt}
                fill
                        className="object-cover group-hover:scale-110 transition-transform duration-200"
                        sizes="120px"
                      />
                      {mainImage.url === img.url && (
                        <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-white dark:bg-gray-800">
                      <p className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 truncate">
                        {viewLabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          )}

          {/* Cap Style Setup - Modern organized layout */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cap Style Setup</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">Customize your cap structure</span>
            </div>
            
            {/* Grid layout for better organization */}
            <div className="grid grid-cols-1 gap-6">
              {/* Bill Shape */}
              {(() => {
                const option = getOptionBySlug('bill-shape');
                if (!option) return null;
                const currentLabel = getSelectedOrDefaultLabel('bill-shape', getDefaultBillShapeFromProductName(product.name));
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bill Shape</label>
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                        {currentLabel}
                      </span>
                    </div>
                                            <div className="grid grid-cols-2 gap-3">
                      {option.choices.map((choice, idx) => (
                        <div
                          key={`bill-shape-${idx}`}
                          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                            currentLabel === choice.label
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-lg shadow-blue-500/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, ['bill-shape']: choice.value }))}
                          role="button"
                          aria-label={`Select ${choice.label} for Bill Shape`}
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            {choice.image ? (
                              <Image src={choice.image} alt={choice.label} fill className="object-cover" sizes="120px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                              </div>
                            )}
                            {currentLabel === choice.label && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Profile */}
              {(() => {
                const option = getOptionBySlug('profile');
                if (!option) return null;
                const currentLabel = getSelectedOrDefaultLabel('profile', 'Mid');
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile</label>
                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full">
                        {currentLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {option.choices.map((choice, idx) => (
                        <div
                          key={`profile-${idx}`}
                          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                            currentLabel === choice.label
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/10 shadow-lg shadow-green-500/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, ['profile']: choice.value }))}
                          role="button"
                          aria-label={`Select ${choice.label} for Profile`}
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            {choice.image ? (
                              <Image src={choice.image} alt={choice.label} fill className="object-cover" sizes="120px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                              </div>
                            )}
                            {currentLabel === choice.label && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Closure Type */}
              {(() => {
                const option = getOptionBySlug('closure-type');
                if (!option) return null;
                const currentLabel = getSelectedOrDefaultLabel('closure-type', 'Snapback');
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Closure Type</label>
                      <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full">
                        {currentLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {option.choices.map((choice, idx) => (
                        <div
                          key={`closure-type-${idx}`}
                          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                            currentLabel === choice.label
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10 shadow-lg shadow-purple-500/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, ['closure-type']: choice.value }))}
                          role="button"
                          aria-label={`Select ${choice.label} for Closure Type`}
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            {choice.image ? (
                              <Image src={choice.image} alt={choice.label} fill className="object-cover" sizes="120px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                              </div>
                            )}
                            {currentLabel === choice.label && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Structure */}
              {(() => {
                const option = getOptionBySlug('structure');
                if (!option) return null;
                const currentLabel = getSelectedOrDefaultLabel('structure', 'Structured');
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Structure</label>
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full">
                        {currentLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {option.choices.map((choice, idx) => (
                        <div
                          key={`structure-${idx}`}
                          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                            currentLabel === choice.label
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 shadow-lg shadow-orange-500/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                          }`}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, ['structure']: choice.value }))}
                          role="button"
                          aria-label={`Select ${choice.label} for Structure`}
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            {choice.image ? (
                              <Image src={choice.image} alt={choice.label} fill className="object-cover" sizes="120px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                              </div>
                            )}
                            {currentLabel === choice.label && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
      </div>

        {/* Middle Column: Color Selection */}
        <div className="lg:col-span-1 space-y-6">
          {/* Step 1: Color Selection */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border transition-all duration-300 ${
            currentStep === 1 ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Step 1: Choose Color Style
              </h3>
              {Object.keys(selectedColors).length > 0 && (
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-sm font-medium">{Object.keys(selectedColors).length} colors selected</span>
                </div>
              )}
        </div>

        {/* Color Type Selection */}
            {typeOptions.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Color Type</label>
            <select
              value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setSelectedColors({}); // Reset color selection when type changes
                    if (e.target.value) setCurrentStep(1);
                  }}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              aria-label="Select color type"
            >
                  {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}

            {/* Color Options */}
            {selectedType && (
          <div>
                <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Available Colors
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {(selectedType === 'All' ? getAllColors() : colorTypes[selectedType] || []).map((option, index) => {
                    const isSelected = selectedColors.hasOwnProperty(option.name);
                    const colorData = selectedColors[option.name];
                    const totalQuantity = colorData ? Object.values(colorData.sizes).reduce((sum, qty) => sum + qty, 0) : 0;
                    
                    return (
                <div
                  key={`${selectedType}-${option.name}-${index}`}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                        isSelected
                          ? 'border-blue-500 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
                      }`}
                                              onClick={() => {
                          handleColorSelection(option.name);
                          if (currentStep === 1) setCurrentStep(2);
                        }}
                  role="button"
                  aria-label={`Select color ${option.name}`}
                >
                      <div className="relative aspect-square">
                  <Image
                    src={option.url}
                    alt={option.alt}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-white dark:bg-gray-800">
                        <p className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 truncate">
                          {option.name}
                        </p>
                        {isSelected && (
                          <p className="text-xs text-center text-blue-600 dark:text-blue-400 font-semibold">
                            {totalQuantity} units
                          </p>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
                
                {/* Color-Size Configuration */}
                {Object.keys(selectedColors).length > 0 && (
                  <div className="mt-6 space-y-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">🎨</span>
                      </div>
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Color & Size Configuration</h4>
                    </div>
                    <div className="space-y-4">
                      {Object.entries(selectedColors).map(([colorName, colorData]) => {
                        const sizeOption = product.productOptions.find(option => option.slug === 'size');
                        if (!sizeOption) return null;
                        
                        return (
                          <div key={colorName} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">{colorName}</h5>
                              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                                {Object.keys(colorData.sizes).length} sizes
                              </span>
                            </div>
                            
                            {/* Size Selection for this Color */}
                            <div className="space-y-3">
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Select Sizes</label>
                              <div className="grid grid-cols-2 gap-2">
                                {sizeOption.choices.map((choice, idx) => {
                                  const isSelected = colorData.sizes.hasOwnProperty(choice.value);
                                  const quantity = colorData.sizes[choice.value] || 0;
                                  
                                  return (
                                    <div
                                      key={`${colorName}-${choice.value}`}
                                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                                        isSelected
                                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                      }`}
                                      onClick={() => handleSizeSelectionForColor(colorName, choice.value)}
                                    >
                                      <div className="p-2 text-center">
                                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{choice.label}</p>
                                        {isSelected && (
                                          <div className="mt-2">
                                            <input
                                              type="number"
                                              min="48"
                                              value={quantity === 0 ? '' : quantity}
                                              onChange={(e) => {
                                                const value = e.target.value;
                                                updateSizeQuantityForColor(colorName, choice.value, value, false);
                                              }}
                                              onBlur={(e) => {
                                                const value = e.target.value;
                                                updateSizeQuantityForColor(colorName, choice.value, value, true);
                                              }}
                                              className="w-full p-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                              placeholder="Qty"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Product Options */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border transition-all duration-300 ${
            currentStep === 2 ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Step 2: Customize Options
              </h3>
              {(multiSelectOptions['logo-setup'] || []).length > 0 && (
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-sm font-medium">Configured</span>
                </div>
              )}
            </div>

            {/* Product Options */}
            {product.productOptions.length > 0 && (
              <div className="space-y-6">
                {/* Always Visible Options - Size, Logo Setup and Accessories */}
                <div className="space-y-6">


                  {/* Logo Setup with Complex Sub-Options */}
                  {(() => {
                    const logoOption = product.productOptions.find(option => option.slug === 'logo-setup');
                    if (!logoOption) return null;
                    
                    const selectedLogoValues = multiSelectOptions['logo-setup'] || [];
                    
                    return (
                      <div key={logoOption.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">{logoOption.name}</label>
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full">
                            {selectedLogoValues.length > 0 ? `${selectedLogoValues.length} selected` : 'Select logos'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {logoOption.choices.map((choice, idx) => {
                            const isSelected = selectedLogoValues.includes(choice.value);
                            return (
                              <div
                                key={`logo-setup-${idx}`}
                                className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                                  isSelected
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10 shadow-lg shadow-green-500/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                }`}
                                onClick={() => toggleMultiSelect('logo-setup', choice.value)}
                                role="button"
                                aria-label={`Select ${choice.label} for ${logoOption.name}`}
                              >
                                <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                  {choice.image ? (
                                    <Image
                                      src={choice.image}
                                      alt={choice.label}
                                      fill
                                      className="object-cover"
                                      sizes="120px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 text-center">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Logo Setup Sub-Options */}
                        {selectedLogoValues.length > 0 && (
                          <div className="mt-4 space-y-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center space-x-2 mb-4">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">⚙️</span>
                              </div>
                              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Logo Configuration</h4>
                            </div>
                            {selectedLogoValues.map(logoValue => {
                              // Handle both original and duplicated logos
                              const originalLogoType = logoValue.includes('-') ? logoValue.split('-')[0] : logoValue;
                              const logoChoice = logoOption.choices.find(c => c.value === originalLogoType);
                              const logoConfig = logoSetupSelections[logoValue] || {};
                              const isDuplicate = logoValue.includes('-') && logoValue !== originalLogoType;
                              
                              return (
                                <div key={logoValue} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800 shadow-sm">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <h5 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                                        {logoChoice?.label || originalLogoType} {isDuplicate ? '(Copy)' : ''}
                                      </h5>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {isDuplicate && (
                                        <button
                                          onClick={() => {
                                            setMultiSelectOptions(prev => ({
                                              ...prev,
                                              'logo-setup': (prev['logo-setup'] || []).filter(v => v !== logoValue)
                                            }));
                                            setLogoSetupSelections(prev => {
                                              const newSelections = { ...prev };
                                              delete newSelections[logoValue];
                                              return newSelections;
                                            });
                                          }}
                                          className="flex items-center justify-center w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200 shadow-sm"
                                          title="Remove this copy"
                                        >
                                          <span className="text-xs font-bold">×</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          const duplicateKey = `${originalLogoType}-${Date.now()}`;
                                          setMultiSelectOptions(prev => ({
                                            ...prev,
                                            'logo-setup': [...(prev['logo-setup'] || []), duplicateKey]
                                          }));
                                          setLogoSetupSelections(prev => ({
                                            ...prev,
                                            [duplicateKey]: {
                                              ...logoConfig,
                                              position: undefined
                                            }
                                          }));
                                        }}
                                        className="flex items-center justify-center w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors duration-200 shadow-sm"
                                        title={`Duplicate ${logoChoice?.label || logoValue}`}
                                      >
                                        <span className="text-xs font-bold">+</span>
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {/* Position Selection */}
                                    <div>
                                      <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Position</label>
                                      <select
                                        value={logoConfig.position || ''}
                                        onChange={(e) => setLogoSetupSelections(prev => ({
                                          ...prev,
                                          [logoValue]: {
                                            ...prev[logoValue],
                                            position: e.target.value,
                                            size: e.target.value ? getDefaultLogoSize(e.target.value) : undefined
                                          }
                                        }))}
                                        className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                      >
                                        <option value="">Select Position</option>
                                        {logoPositions.map(pos => {
                                          // Get all used positions except the current logo's position
                                          const usedPositions = Object.entries(logoSetupSelections)
                                            .filter(([key, config]) => key !== logoValue && config.position)
                                            .map(([, config]) => config.position);
                                          
                                          const isDisabled = usedPositions.includes(pos);
                                          return (
                                            <option key={pos} value={pos} disabled={isDisabled}>
                                              {pos} {isDisabled ? '(Already Used)' : ''}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </div>

                                    {/* Size Selection (appears when position is selected) */}
                                    {logoConfig.position && (
                                      <div>
                                        <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Size</label>
                                        <select
                                          value={logoConfig.size || getDefaultLogoSize(logoConfig.position)}
                                          onChange={(e) => setLogoSetupSelections(prev => ({
                                            ...prev,
                                            [logoValue]: {
                                              ...prev[logoValue],
                                              size: e.target.value
                                            }
                                          }))}
                                          className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        >
                                          {logoSizes.map(size => (
                                            <option key={size} value={size}>{size}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}

                                    {/* Application Method (appears when size is selected) */}
                                    {logoConfig.size && (
                                      <div>
                                        <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Application Method</label>
                                        <select
                                          value={logoConfig.application || getDefaultApplication(logoChoice?.label || '')}
                                          onChange={(e) => setLogoSetupSelections(prev => ({
                                            ...prev,
                                            [logoValue]: {
                                              ...prev[logoValue],
                                              application: e.target.value
                                            }
                                          }))}
                                          className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        >
                                          {logoApplications.map(app => (
                                            <option key={app} value={app}>{app}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Accessories with Multi-Select */}
                  {(() => {
                    const accessoriesOption = product.productOptions.find(option => option.slug === 'accessories');
                    if (!accessoriesOption) return null;
                    
                    const selectedAccessoryValues = multiSelectOptions.accessories || [];
                    
                    return (
                      <div key={accessoriesOption.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">{accessoriesOption.name}</label>
                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full">
                            {selectedAccessoryValues.length > 0 ? `${selectedAccessoryValues.length} selected` : 'Select accessories'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {accessoriesOption.choices.map((choice, idx) => {
                            const isSelected = selectedAccessoryValues.includes(choice.value);
                            return (
                              <div
                                key={`accessories-${idx}`}
                                className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                                  isSelected
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10 shadow-lg shadow-purple-500/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                }`}
                                onClick={() => toggleMultiSelect('accessories', choice.value)}
                                role="button"
                                aria-label={`Select ${choice.label} accessory`}
                              >
                                <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                  {choice.image ? (
                                    <Image
                                      src={choice.image}
                                      alt={choice.label}
                                      fill
                                      className="object-cover"
                                      sizes="120px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 text-center">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Optional Options Toggle */}
                {product.productOptions.some(option => ['delivery-type', 'services'].includes(option.slug)) && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowOptionalOptions(!showOptionalOptions)}
                      className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl border border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all duration-200 shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">⚡</span>
                        </div>
                        <span className="font-semibold text-purple-900 dark:text-purple-100">Additional Options</span>
                      </div>
                      <span className={`transform transition-transform duration-200 text-purple-600 dark:text-purple-400 ${showOptionalOptions ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>
                  </div>
                )}

                {/* Optional Options (Expandable) - Delivery Type, Services */}
                {showOptionalOptions && (
                  <div className="space-y-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm">
                    {/* Delivery Type - Single Select */}
                    {(() => {
                      const deliveryOption = product.productOptions.find(option => option.slug === 'delivery-type');
                      if (!deliveryOption) return null;
                      
                      const currentLabel = getSelectedOrDefaultLabel('delivery-type', 'Regular');
                      
                      return (
                        <div key={deliveryOption.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">{deliveryOption.name}</label>
                            <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full">
                              {currentLabel}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {deliveryOption.choices.map((choice, idx) => {
                              const totalQuantity = Object.values(selectedColors).reduce((sum, colorData) => 
                                sum + Object.values(colorData.sizes).reduce((colorSum, qty) => colorSum + qty, 0), 0
                              );
                              const choiceValueLower = choice.value.toLowerCase();
                              const choiceLabelLower = choice.label.toLowerCase();
                              const isAirOrSeaFreight = 
                                choiceValueLower.includes('air') || 
                                choiceValueLower.includes('freight') ||
                                choiceLabelLower.includes('air') ||
                                choiceLabelLower.includes('freight') ||
                                ['air-freight', 'sea-freight', 'air freight', 'sea freight'].includes(choiceValueLower) ||
                                ['air-freight', 'sea-freight', 'air freight', 'sea freight'].includes(choiceLabelLower);
                              const isDisabled = isAirOrSeaFreight && totalQuantity < 3168;
                              
                              // Auto-deselect air/sea freight if it becomes disabled
                              if (isDisabled && selectedOptions['delivery-type'] === choice.value) {
                                const regularChoice = deliveryOption.choices.find(c => 
                                  c.label.toLowerCase().includes('regular') || 
                                  c.value.toLowerCase().includes('regular')
                                );
                                setTimeout(() => {
                                  setSelectedOptions(prev => ({
                                    ...prev,
                                    'delivery-type': regularChoice?.value || deliveryOption.choices[0]?.value || ''
                                  }));
                                }, 0);
                              }
                              
                              return (
                                <div
                                  key={`delivery-type-${idx}`}
                                  className={`rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                                    isDisabled
                                      ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50 pointer-events-none'
                                      : selectedOptions['delivery-type'] === choice.value
                                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 shadow-lg shadow-orange-500/20 cursor-pointer hover:scale-[1.02] hover:shadow-md'
                                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800 cursor-pointer hover:scale-[1.02] hover:shadow-md'
                                  }`}
                                  onClick={() => {
                                    if (!isDisabled) {
                                      setSelectedOptions(prev => ({
                                        ...prev,
                                        'delivery-type': choice.value
                                      }));
                                    }
                                  }}
                                  role="button"
                                  aria-label={`Select ${choice.label} for ${deliveryOption.name}`}
                                >
                                <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                  {choice.image ? (
                                    <Image
                                      src={choice.image}
                                      alt={choice.label}
                                      fill
                                      className="object-cover"
                                      sizes="120px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                                    </div>
                                  )}
                                  {selectedOptions['delivery-type'] === choice.value && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 text-center">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                                    {choice.label}
                                    {isDisabled && (
                                      <span className="block text-xs text-red-500 mt-1">
                                        Requires 3168+ units (Current: {totalQuantity})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Services - Multi Select */}
                    {(() => {
                      const servicesOption = product.productOptions.find(option => option.slug === 'services');
                      if (!servicesOption) return null;
                      
                      const selectedServicesValues = multiSelectOptions.services || [];
                      
                      return (
                        <div key={servicesOption.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">{servicesOption.name}</label>
                            <span className="text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-full">
                              {selectedServicesValues.length > 0 ? `${selectedServicesValues.length} selected` : 'Select services'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {servicesOption.choices.map((choice, idx) => {
                              const isSelected = selectedServicesValues.includes(choice.value);
                              return (
                                <div
                                  key={`services-${idx}`}
                                  className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                                    isSelected
                                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/10 shadow-lg shadow-teal-500/20'
                                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                  }`}
                                  onClick={() => toggleMultiSelect('services', choice.value)}
                                  role="button"
                                  aria-label={`Select ${choice.label} service`}
                                >
                                  <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                                    {choice.image ? (
                                      <Image
                                        src={choice.image}
                                        alt={choice.label}
                                        fill
                                        className="object-cover"
                                        sizes="120px"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{choice.label}</span>
                                      </div>
                                    )}
                                    {isSelected && (
                                      <div className="absolute top-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-3 text-center">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{choice.label}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Product Details & Options */}
        <div className="lg:col-span-1 space-y-6">
          {/* Product Info Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{product.name}</h1>
            <div dangerouslySetInnerHTML={{ __html: product.description }} className="text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert" />

          </div>

          {/* Pricing Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Volume Pricing</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { qty: '48+', price: product.pricing.price48 },
                { qty: '144+', price: product.pricing.price144 },
                { qty: '576+', price: product.pricing.price576 },
                { qty: '1152+', price: product.pricing.price1152 },
                { qty: '2880+', price: product.pricing.price2880 },
                { qty: '10000+', price: product.pricing.price10000 }
              ].map((tier, index) => (
                <div key={tier.qty} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tier.qty}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">${tier.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Costing & Calculation Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Cost Calculator</h3>
            
            {/* Cost Breakdown */}
            {Object.keys(selectedColors).length > 0 ? (
              <CostCalculator 
                selectedColors={selectedColors}
                logoSetupSelections={logoSetupSelections}
                multiSelectOptions={multiSelectOptions}
                selectedOptions={selectedOptions}
                productPricing={product.pricing}
              />
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <p className="text-sm">Select sizes to see cost calculation</p>
              </div>
            )}
          </div>









          {/* Action Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              {/* Validation Summary */}
              {Object.keys(selectedColors).length === 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Please select at least one color to continue
                    </span>
                  </div>
                </div>
              )}

                            {/* Order Summary */}
              {Object.keys(selectedColors).length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Order Summary</h4>
                  <div className="space-y-1">
                    {Object.entries(selectedColors).map(([colorName, colorData]) => {
                      const totalQuantity = Object.values(colorData.sizes).reduce((sum, qty) => sum + qty, 0);
                      return (
                        <div key={colorName} className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            {colorName}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {totalQuantity} units
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

        {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    Object.keys(selectedColors).length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-105'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={Object.keys(selectedColors).length === 0}
                  aria-label="Add to cart"
                >
            Add to Cart
          </button>
                <button 
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    Object.keys(selectedColors).length > 0
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25 hover:shadow-green-600/40 hover:scale-105'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={Object.keys(selectedColors).length === 0}
                  aria-label="Buy now"
                >
            Buy Now
          </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
