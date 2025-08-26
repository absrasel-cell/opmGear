'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Percent,
  Save,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Calculator,
  Eye,
  EyeOff,
  TestTube,
  FileText,
  Package,
  Truck,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/dashboard';

interface SimplifiedMarginSetting {
  id: string;
  category: 'BLANK_CAPS' | 'CUSTOMIZATIONS' | 'DELIVERY';
  marginPercent: number;
  flatMargin: number;
  isActive: boolean;
  csvSource: string;
  description: string;
  exampleItems: string[];
}

interface SimplifiedMarginManagerProps {
  onSettingsChange?: (settings: SimplifiedMarginSetting[]) => void;
  className?: string;
}

const categoryInfo = {
  'BLANK_CAPS': {
    name: 'Blank Caps',
    icon: Package,
    color: 'bg-blue-500/10 border-blue-400/20 text-blue-300',
    csvSource: 'Blank Cap Pricings.csv',
    description: 'All cap tier pricing (Tier 1, 2, 3)',
    exampleItems: ['Tier 1 Cap ($1.80)', 'Tier 2 Cap ($2.20)', 'Tier 3 Cap ($2.40)'],
    csvColumn: 'Name (type column for matching)'
  },
  'CUSTOMIZATIONS': {
    name: 'All Customizations',
    icon: Settings,
    color: 'bg-green-500/10 border-green-400/20 text-green-300',
    csvSource: 'Customization Pricings.csv',
    description: 'Logo types, Accessories, Premium Closures, Fabrics, Applications',
    exampleItems: ['3D Embroidery ($0.20)', 'Large Rubber Patch ($1.50)', 'Hang Tags ($0.50)', 'Metal Eyelets ($0.25)'],
    csvColumn: 'type = "logos", "Logos", "Accessories", "Premium Closure", "Premium Fabric", "Application", "Mold"'
  },
  'DELIVERY': {
    name: 'Delivery Cost',
    icon: Truck,
    color: 'bg-orange-500/10 border-orange-400/20 text-orange-300',
    csvSource: 'Customization Pricings.csv',
    description: 'All shipping and delivery options',
    exampleItems: ['Regular Delivery ($3.00)', 'Priority Delivery ($3.20)', 'Air Freight ($1.20)', 'Sea Freight ($0.40)'],
    csvColumn: 'type = "Shipping"'
  }
};

export default function SimplifiedMarginManager({ onSettingsChange, className = '' }: SimplifiedMarginManagerProps) {
  const [settings, setSettings] = useState<SimplifiedMarginSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  // Load simplified margin settings
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Loading simplified margin settings...');
      
      const response = await fetch('/api/billing/margins/simplified', {
        credentials: 'include'
      });

      console.log('🔄 Load response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Failed to load simplified margin settings: HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('🔄 Load response data:', data);

      if (data.success) {
        console.log('✅ Settings loaded successfully:', data.data);
        setSettings(data.data);
        onSettingsChange?.(data.data);
      } else {
        throw new Error(data.error || 'Server responded with success: false');
      }
    } catch (err: any) {
      console.error('❌ Error loading simplified margin settings:', err);
      setError(`Load failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Save simplified margin settings
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      console.log('💾 Attempting to save settings:', settings);

      // Validate settings before sending
      const validatedSettings = settings.map(setting => ({
        ...setting,
        marginPercent: Number(setting.marginPercent),
        flatMargin: Number(setting.flatMargin)
      }));

      console.log('💾 Validated settings before save:', validatedSettings);

      const response = await fetch('/api/billing/margins/simplified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: validatedSettings })
      });
      
      console.log('💾 Save response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('💾 Save response data:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to save settings`);
      }

      if (data.success) {
        console.log('✅ Settings saved successfully, updating UI with:', data.data);
        setSettings(data.data);
        onSettingsChange?.(data.data);
        showToast('✅ Simplified margin settings saved successfully to database');
        
        // Don't reload from server immediately, trust the response
        // await loadSettings();
      } else {
        throw new Error(data.error || 'Server responded with success: false');
      }
    } catch (err: any) {
      console.error('❌ Error saving simplified margin settings:', err);
      setError(`Save failed: ${err.message}`);
      showToast(`❌ Save Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Test margin calculations
  const testMargins = async () => {
    try {
      setIsTesting(true);
      setError(null);

      const response = await fetch('/api/billing/margins/simplified/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings })
      });

      if (!response.ok) {
        throw new Error('Failed to test margin calculations');
      }

      const data = await response.json();
      if (data.success) {
        setTestResults(data.testResults);
        showToast('Margin test completed successfully');
      } else {
        throw new Error(data.error || 'Failed to test margins');
      }
    } catch (err: any) {
      console.error('Error testing margins:', err);
      setError(err.message);
      showToast(`Test Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Update setting
  const updateSetting = (category: SimplifiedMarginSetting['category'], field: keyof SimplifiedMarginSetting, value: any) => {
    setSettings(prevSettings => 
      prevSettings.map(setting => 
        setting.category === category 
          ? { ...setting, [field]: value }
          : setting
      )
    );
  };

  // Calculate example margin price
  const calculateExampleMarginPrice = (baseAmount: number, marginPercent: number, flatMargin: number) => {
    if (marginPercent >= 100) marginPercent = 99;
    const marginDecimal = marginPercent / 100;
    const basePrice = baseAmount / (1 - marginDecimal);
    return Math.max(0, basePrice + flatMargin);
  };

  // Format currency
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Toast notification
  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-slate-800 border border-slate-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => document.body.contains(toast) && document.body.removeChild(toast), 300);
    }, 3000);
  };

  // Initialize default settings if none exist
  useEffect(() => {
    if (!isLoading && settings.length === 0) {
      const defaultSettings: SimplifiedMarginSetting[] = [
        {
          id: 'blank-caps',
          category: 'BLANK_CAPS',
          marginPercent: 60,
          flatMargin: 0.00,
          isActive: true,
          csvSource: 'Blank Cap Pricings.csv',
          description: categoryInfo.BLANK_CAPS.description,
          exampleItems: categoryInfo.BLANK_CAPS.exampleItems
        },
        {
          id: 'customizations',
          category: 'CUSTOMIZATIONS',
          marginPercent: 65,
          flatMargin: 0.10,
          isActive: true,
          csvSource: 'Customization Pricings.csv',
          description: categoryInfo.CUSTOMIZATIONS.description,
          exampleItems: categoryInfo.CUSTOMIZATIONS.exampleItems
        },
        {
          id: 'delivery',
          category: 'DELIVERY',
          marginPercent: 50,
          flatMargin: 0.25,
          isActive: true,
          csvSource: 'Customization Pricings.csv',
          description: categoryInfo.DELIVERY.description,
          exampleItems: categoryInfo.DELIVERY.exampleItems
        }
      ];
      setSettings(defaultSettings);
    }
  }, [isLoading]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-lime-500/20 border border-lime-400/30 p-3">
            <Calculator className="h-6 w-6 text-lime-300" />
          </div>
          <div>
            <h2 className="text-white tracking-tight text-[28px] sm:text-[32px] md:text-[36px] font-semibold">
              Simplified Margin Management
            </h2>
            <p className="text-slate-300/80 text-[15px]">3 consolidated categories - comprehensive coverage, simple management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSettings}
            disabled={isLoading}
            className="bg-white/5 border border-white/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={testMargins}
            disabled={isTesting || isLoading}
            className="bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30"
          >
            <TestTube className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testing...' : 'Test'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('🔍 Current settings state:', settings);
              showToast('Current settings logged to console');
            }}
            className="bg-purple-500/20 border border-purple-400/30 text-purple-300 hover:bg-purple-500/30"
            title="Log current state to console for debugging"
          >
            <Eye className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button
            variant="primary"
            onClick={saveSettings}
            disabled={isSaving || isLoading}
            className="bg-lime-500/20 border border-lime-400/30 text-lime-300 hover:bg-lime-500/30"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-300 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto text-red-300 hover:text-red-200"
          >
            ×
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading simplified margin settings...</p>
        </div>
      )}

      {/* Simplified Margin Categories */}
      {!isLoading && (
        <div className="space-y-6">
          {settings.map((setting) => {
            const info = categoryInfo[setting.category];
            const IconComponent = info.icon;
            
            return (
              <div key={setting.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                {/* Category Header */}
                <div className="bg-white/2.5 border-b border-white/10 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${info.color}`}>
                        <IconComponent className="h-4 w-4" />
                        {info.name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <FileText className="h-3 w-3" />
                        {info.csvSource}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateSetting(setting.category, 'isActive', !setting.isActive)}
                      className={setting.isActive ? 'bg-green-500/20 border-green-400/30 text-green-300' : 'bg-red-500/20 border-red-400/30 text-red-300'}
                    >
                      {setting.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">{info.description}</p>
                  <div className="text-xs text-slate-500 mt-1">
                    <strong>CSV Column Filter:</strong> {info.csvColumn}
                  </div>
                </div>

                {/* Settings Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Margin Controls */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-300 text-sm mb-2">Margin Percentage (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="95"
                            step="0.5"
                            value={setting.marginPercent}
                            onChange={(e) => updateSetting(setting.category, 'marginPercent', Number(e.target.value))}
                            className="w-full rounded-lg bg-white/5 border border-white/10 text-slate-200 px-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                          />
                          <Percent className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm mb-2">Flat Addition ($)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={setting.flatMargin}
                            onChange={(e) => updateSetting(setting.category, 'flatMargin', Number(e.target.value))}
                            className="w-full rounded-lg bg-white/5 border border-white/10 text-slate-200 pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Example Calculations */}
                    <div>
                      <label className="block text-slate-300 text-sm mb-2">Example Price Calculations</label>
                      <div className="space-y-2">
                        {info.exampleItems.map((item, index) => {
                          const basePrice = item.includes('$1.80') ? 1.80 : 
                                          item.includes('$2.20') ? 2.20 : 
                                          item.includes('$2.40') ? 2.40 :
                                          item.includes('$0.20') ? 0.20 :
                                          item.includes('$1.50') ? 1.50 :
                                          item.includes('$0.50') ? 0.50 :
                                          item.includes('$0.25') ? 0.25 :
                                          item.includes('$3.00') ? 3.00 :
                                          item.includes('$3.20') ? 3.20 :
                                          item.includes('$1.20') ? 1.20 :
                                          item.includes('$0.40') ? 0.40 : 1.00;
                          
                          const customerPrice = calculateExampleMarginPrice(basePrice, setting.marginPercent, setting.flatMargin);
                          
                          return (
                            <div key={index} className="flex justify-between items-center bg-white/2 rounded-lg px-3 py-2">
                              <span className="text-slate-400 text-sm">{item}</span>
                              <span className="text-lime-300 font-medium">→ {formatPrice(customerPrice)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Coverage Information */}
                    <div>
                      <label className="block text-slate-300 text-sm mb-2">Coverage & Integration</label>
                      <div className="bg-slate-800/40 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-green-300">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-medium">Advanced Product Page Integration</span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <p>• Automatically applies to product customization</p>
                          <p>• Covers ALL pricing from CSV source</p>
                          <p>• No options left out or missed</p>
                          <p>• Real-time price calculations</p>
                        </div>
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-xs text-slate-500">
                            This margin applies to all items in <strong>{info.csvSource}</strong> matching the column filter above.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Margin Formula Explanation */}
                  <div className="mt-4 p-3 bg-slate-700/30 border border-slate-600/30 rounded-lg">
                    <p className="text-xs text-slate-400">
                      💡 <strong>Margin Formula:</strong> Cost ÷ (1 - Margin%) + Flat Addition. This ensures your cost represents the desired percentage of the final selling price. 
                      Example: 60% margin means cost is 40% of selling price.
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="bg-white/2.5 border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <TestTube className="h-5 w-5 text-cyan-300" />
              <h3 className="text-white font-semibold">Margin Test Results</h3>
            </div>
          </div>
          <div className="p-6">
            <pre className="text-slate-300 text-sm bg-slate-800/40 rounded-lg p-4 overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {settings.map((setting) => {
          const info = categoryInfo[setting.category];
          const avgExample = info.exampleItems.reduce((sum, item) => {
            const basePrice = parseFloat(item.match(/\$([0-9.]+)/)?.[1] || '1');
            return sum + calculateExampleMarginPrice(basePrice, setting.marginPercent, setting.flatMargin);
          }, 0) / info.exampleItems.length;

          return (
            <div key={setting.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 font-medium">{info.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${setting.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  {setting.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-slate-400 text-sm">
                Avg Customer Price: <span className="text-lime-300 font-medium">{formatPrice(avgExample)}</span>
              </div>
              <div className="text-slate-500 text-xs mt-1">
                {setting.marginPercent}% + ${setting.flatMargin.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}