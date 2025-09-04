'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, CalculatorIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface PricingTier {
  id: string;
  name: string;
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
  isDefault: boolean;
  isActive: boolean;
}

interface TierWithMargins {
  id: string;
  name: string;
  factoryCosts: {
    price48: number;
    price144: number;
    price576: number;
    price1152: number;
    price2880: number;
    price10000: number;
  };
  marginSettings: {
    marginPercent: number;
    flatMargin: number;
    activeType: 'percentage' | 'flat';
  };
  isDefault: boolean;
  isActive: boolean;
}

interface PricingFormData {
  name: string;
  price48: string;
  price144: string;
  price576: string;
  price1152: string;
  price2880: string;
  price10000: string;
  isDefault: boolean;
}

const defaultFormData: PricingFormData = {
  name: '',
  price48: '',
  price144: '',
  price576: '',
  price1152: '',
  price2880: '',
  price10000: '',
  isDefault: false
};

export default function PricingManager() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [tiersWithMargins, setTiersWithMargins] = useState<TierWithMargins[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMarginForm, setShowMarginForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PricingFormData>(defaultFormData);
  const [marginType, setMarginType] = useState<'percentage' | 'flat'>('percentage');
  const [marginValue, setMarginValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [savingMargins, setSavingMargins] = useState(false);

  useEffect(() => {
    fetchTiers();
    fetchTierMargins();
  }, []);

  const calculateSellingPrice = (factoryCost: number, marginSettings: TierWithMargins['marginSettings']): number => {
    if (marginSettings.activeType === 'percentage') {
      return factoryCost * (1 + marginSettings.marginPercent / 100);
    } else {
      return factoryCost + marginSettings.flatMargin;
    }
  };

  const fetchTiers = async () => {
    try {
      const response = await fetch('/api/admin/pricing');
      if (response.ok) {
        const data = await response.json();
        setTiers(data);
      }
    } catch (error) {
      console.error('Error fetching pricing tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTierMargins = async () => {
    try {
      const response = await fetch('/api/admin/pricing/margins');
      if (response.ok) {
        const data = await response.json();
        setTiersWithMargins(data);
        
        // Set current margin settings for the form
        if (data.length > 0) {
          const firstTierMargin = data[0].marginSettings;
          setMarginType(firstTierMargin.activeType);
          setMarginValue(firstTierMargin.activeType === 'percentage' ? firstTierMargin.marginPercent : firstTierMargin.flatMargin);
        }
      }
    } catch (error) {
      console.error('Error fetching tier margins:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId 
        ? { ...formData, id: editingId }
        : formData;

      const response = await fetch('/api/admin/pricing', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchTiers();
        await fetchTierMargins(); // Refresh margin data too
        setShowForm(false);
        setEditingId(null);
        setFormData(defaultFormData);
      } else {
        console.error('Failed to save pricing tier');
      }
    } catch (error) {
      console.error('Error saving pricing tier:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tier: PricingTier) => {
    setFormData({
      name: tier.name,
      price48: tier.price48.toString(),
      price144: tier.price144.toString(),
      price576: tier.price576.toString(),
      price1152: tier.price1152.toString(),
      price2880: tier.price2880.toString(),
      price10000: tier.price10000.toString(),
      isDefault: tier.isDefault
    });
    setEditingId(tier.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing tier?')) return;

    try {
      const response = await fetch(`/api/admin/pricing?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTiers();
        await fetchTierMargins(); // Refresh margin data too
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete pricing tier');
      }
    } catch (error) {
      console.error('Error deleting pricing tier:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(defaultFormData);
  };

  const handleMarginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMargins(true);

    try {
      const response = await fetch('/api/admin/pricing/margins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marginType,
          marginValue
        }),
      });

      if (response.ok) {
        await fetchTierMargins();
        setShowMarginForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update margin settings');
      }
    } catch (error) {
      console.error('Error updating margin settings:', error);
    } finally {
      setSavingMargins(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-white/20 rounded-lg backdrop-blur-sm"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/20 rounded-lg backdrop-blur-sm"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Pricing Management</h2>
          <p className="text-white/70 mt-1">Manage factory costs and selling price margins for all pricing tiers</p>
        </div>
        <div className="flex items-center gap-3">
          {!showForm && !showMarginForm && (
            <>
              <button
                onClick={() => setShowMarginForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 
                         text-orange-300 border border-orange-500/30 rounded-lg transition-all duration-200 
                         backdrop-blur-sm hover:backdrop-blur-md"
              >
                <CalculatorIcon className="h-5 w-5" />
                Manage Margins
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-lime-500/20 hover:bg-lime-500/30 
                         text-lime-300 border border-lime-500/30 rounded-lg transition-all duration-200 
                         backdrop-blur-sm hover:backdrop-blur-md"
              >
                <PlusIcon className="h-5 w-5" />
                Add Tier
              </button>
            </>
          )}
        </div>
      </div>

      {/* Margin Management Form */}
      {showMarginForm && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Margin Settings</h3>
          <p className="text-white/60 text-sm mb-6">
            Set global margins applied to all factory costs to calculate selling prices. 
            These margins apply to all pricing tiers uniformly.
          </p>
          
          <form onSubmit={handleMarginSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Margin Type Selection */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">Margin Type</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                    <input
                      type="radio"
                      name="marginType"
                      value="percentage"
                      checked={marginType === 'percentage'}
                      onChange={(e) => setMarginType(e.target.value as 'percentage')}
                      className="text-orange-500 focus:ring-orange-500/50"
                    />
                    <div>
                      <div className="text-white font-medium">Percentage Markup</div>
                      <div className="text-white/60 text-sm">Add percentage on top of factory cost</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                    <input
                      type="radio"
                      name="marginType"
                      value="flat"
                      checked={marginType === 'flat'}
                      onChange={(e) => setMarginType(e.target.value as 'flat')}
                      className="text-orange-500 focus:ring-orange-500/50"
                    />
                    <div>
                      <div className="text-white font-medium">Flat Rate</div>
                      <div className="text-white/60 text-sm">Add fixed dollar amount to factory cost</div>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Margin Value Input */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">
                  {marginType === 'percentage' ? 'Markup Percentage' : 'Flat Rate Amount'}
                </label>
                <div className="relative">
                  {marginType === 'flat' && (
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">$</span>
                  )}
                  <input
                    type="number"
                    step={marginType === 'percentage' ? '0.1' : '0.01'}
                    min="0"
                    value={marginValue}
                    onChange={(e) => setMarginValue(parseFloat(e.target.value) || 0)}
                    className={`w-full ${marginType === 'flat' ? 'pl-8' : 'pl-3'} pr-12 py-3 bg-white/10 border border-white/20 rounded-lg 
                             text-white placeholder-white/50 focus:outline-none focus:ring-2 
                             focus:ring-orange-500/50 focus:border-transparent backdrop-blur-sm`}
                    placeholder={marginType === 'percentage' ? '25.0' : '0.50'}
                    required
                  />
                  {marginType === 'percentage' && (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50">%</span>
                  )}
                </div>
                
                {/* Example calculation */}
                <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-sm text-white/70 mb-1">Example: $1.50 factory cost</div>
                  <div className="text-white font-medium">
                    Selling Price: $
                    {marginType === 'percentage' 
                      ? (1.50 * (1 + marginValue / 100)).toFixed(2)
                      : (1.50 + marginValue).toFixed(2)
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={savingMargins}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 
                         text-orange-300 border border-orange-500/30 rounded-lg transition-all duration-200 
                         backdrop-blur-sm hover:backdrop-blur-md disabled:opacity-50"
              >
                <CheckIcon className="h-5 w-5" />
                {savingMargins ? 'Saving...' : 'Update Margins'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowMarginForm(false)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 
                         text-white/70 border border-white/20 rounded-lg transition-all duration-200 
                         backdrop-blur-sm hover:backdrop-blur-md"
              >
                <XMarkIcon className="h-5 w-5" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Factory Cost Form */}
      {showForm && (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Edit Factory Cost Tier' : 'Create New Factory Cost Tier'}
          </h3>
          <p className="text-white/60 text-sm mb-6">
            Manage factory costs for different pricing tiers. Selling prices are calculated by applying margins to these factory costs.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Tier Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                           text-white placeholder-white/50 focus:outline-none focus:ring-2 
                           focus:ring-lime-500/50 focus:border-transparent backdrop-blur-sm"
                  placeholder="e.g., Tier 1"
                  required
                />
              </div>
              
              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-lime-500 focus:ring-lime-500/50 border-white/30 rounded"
                />
                <label htmlFor="isDefault" className="text-sm font-medium text-white/80">
                  Set as Default Tier
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'price48', label: '48+ Units', qty: '48' },
                { key: 'price144', label: '144+ Units', qty: '144' },
                { key: 'price576', label: '576+ Units', qty: '576' },
                { key: 'price1152', label: '1,152+ Units', qty: '1152' },
                { key: 'price2880', label: '2,880+ Units', qty: '2880' },
                { key: 'price10000', label: '10,000+ Units', qty: '10000' }
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {field.label} <span className="text-white/50">(Factory Cost)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData[field.key as keyof PricingFormData] as string}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        [field.key]: e.target.value 
                      })}
                      className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                               text-white placeholder-white/50 focus:outline-none focus:ring-2 
                               focus:ring-lime-500/50 focus:border-transparent backdrop-blur-sm"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-lime-500/20 hover:bg-lime-500/30 
                         text-lime-300 border border-lime-500/30 rounded-lg transition-all duration-200 
                         backdrop-blur-sm hover:backdrop-blur-md disabled:opacity-50"
              >
                <CheckIcon className="h-5 w-5" />
                {saving ? 'Saving...' : editingId ? 'Update Tier' : 'Create Tier'}
              </button>
              
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 
                         text-white/70 border border-white/20 rounded-lg transition-all duration-200 
                         backdrop-blur-sm hover:backdrop-blur-md"
              >
                <XMarkIcon className="h-5 w-5" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Margin Display */}
      {tiersWithMargins.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 backdrop-blur-md border border-orange-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <CurrencyDollarIcon className="h-5 w-5 text-orange-300" />
            <h3 className="text-lg font-semibold text-white">Current Margin Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-white/60">Margin Type</div>
              <div className="text-white font-medium capitalize">
                {tiersWithMargins[0]?.marginSettings.activeType} 
                {tiersWithMargins[0]?.marginSettings.activeType === 'percentage' ? ' Markup' : ' Rate'}
              </div>
            </div>
            <div>
              <div className="text-white/60">Current Value</div>
              <div className="text-white font-medium">
                {tiersWithMargins[0]?.marginSettings.activeType === 'percentage' 
                  ? `${tiersWithMargins[0]?.marginSettings.marginPercent}%`
                  : `$${tiersWithMargins[0]?.marginSettings.flatMargin.toFixed(2)}`
                }
              </div>
            </div>
            <div>
              <div className="text-white/60">Example (on $1.50 cost)</div>
              <div className="text-white font-medium">
                ${tiersWithMargins[0]?.marginSettings.activeType === 'percentage'
                  ? (1.50 * (1 + tiersWithMargins[0]?.marginSettings.marginPercent / 100)).toFixed(2)
                  : (1.50 + tiersWithMargins[0]?.marginSettings.flatMargin).toFixed(2)
                } selling price
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Tiers List */}
      <div className="space-y-4">
        {tiersWithMargins.map((tierData) => (
          <div key={tierData.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">{tierData.name}</h3>
                {tierData.isDefault && (
                  <span className="px-2 py-1 bg-lime-500/20 text-lime-300 text-xs font-medium 
                                 rounded-full border border-lime-500/30">
                    DEFAULT
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const tier = tiers.find(t => t.id === tierData.id);
                    if (tier) handleEdit(tier);
                  }}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg 
                           transition-all duration-200"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                
                {!tierData.isDefault && (
                  <button
                    onClick={() => handleDelete(tierData.id)}
                    className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg 
                             transition-all duration-200"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Factory Costs Row */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-white/70 mb-3">Factory Costs</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { qty: '48+', price: tierData.factoryCosts.price48 },
                  { qty: '144+', price: tierData.factoryCosts.price144 },
                  { qty: '576+', price: tierData.factoryCosts.price576 },
                  { qty: '1,152+', price: tierData.factoryCosts.price1152 },
                  { qty: '2,880+', price: tierData.factoryCosts.price2880 },
                  { qty: '10,000+', price: tierData.factoryCosts.price10000 }
                ].map((item) => (
                  <div key={item.qty} className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-xs text-white/60 mb-1">{item.qty} units</div>
                    <div className="text-sm font-semibold text-white/80">
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Selling Prices Row */}
            <div>
              <h4 className="text-sm font-medium text-lime-300 mb-3">Selling Prices (with margins applied)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { qty: '48+', factoryCost: tierData.factoryCosts.price48 },
                  { qty: '144+', factoryCost: tierData.factoryCosts.price144 },
                  { qty: '576+', factoryCost: tierData.factoryCosts.price576 },
                  { qty: '1,152+', factoryCost: tierData.factoryCosts.price1152 },
                  { qty: '2,880+', factoryCost: tierData.factoryCosts.price2880 },
                  { qty: '10,000+', factoryCost: tierData.factoryCosts.price10000 }
                ].map((item) => {
                  const sellingPrice = calculateSellingPrice(item.factoryCost, tierData.marginSettings);
                  const profit = sellingPrice - item.factoryCost;
                  
                  return (
                    <div key={item.qty} className="text-center p-3 bg-lime-500/10 rounded-lg border border-lime-500/20">
                      <div className="text-xs text-white/60 mb-1">{item.qty} units</div>
                      <div className="text-lg font-bold text-lime-300">
                        ${sellingPrice.toFixed(2)}
                      </div>
                      <div className="text-xs text-lime-400/70">
                        +${profit.toFixed(2)} profit
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        
        {tiersWithMargins.length === 0 && (
          <div className="text-center py-12 text-white/60">
            <div className="text-lg font-medium mb-2">No pricing tiers found</div>
            <div className="text-sm">Create your first pricing tier to get started</div>
          </div>
        )}
      </div>
    </div>
  );
}