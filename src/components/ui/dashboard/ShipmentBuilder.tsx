'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Truck,
  Plane,
  Ship,
  AlertCircle,
  X,
  Plus,
  Save,
  ArrowRight,
  RefreshCw,
  Edit,
  Trash2
} from 'lucide-react';
import { 
  GlassCard, 
  Button, 
  SearchInput, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  TableHeaderCell, 
  StatusBadge 
} from './index';

interface Order {
  id: string;
  productName: string;
  status: string;
  orderSource: string;
  orderType: string;
  createdAt: string;
  customerInfo: {
    name: string;
    email: string;
  };
  shipmentId?: string;
}

interface Shipment {
  id: string;
  buildNumber: string;
  shippingMethod: string;
  estimatedDeparture?: string;
  estimatedDelivery?: string;
  status: string;
  createdAt: string;
  orders: Order[];
}

interface ShipmentBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshOrders?: () => void;
  initialShipmentId?: string;
}

export default function ShipmentBuilder({ isOpen, onClose, onRefreshOrders, initialShipmentId }: ShipmentBuilderProps) {
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [existingShipments, setExistingShipments] = useState<Shipment[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [formData, setFormData] = useState({
    buildNumber: '',
    shippingMethod: 'PRIORITY_FEDEX',
    estimatedDeparture: '',
    estimatedDelivery: '',
    notes: ''
  });
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const shippingMethods = [
    { value: 'PRIORITY_FEDEX', label: 'Priority (FedEx)', duration: '4–5 days' },
    { value: 'SAVER_UPS', label: 'Saver (UPS Saver)', duration: '8–12 days' },
    { value: 'AIR_FREIGHT', label: 'Air Freight', duration: '15–20 days' },
    { value: 'SEA_FREIGHT', label: 'Sea Freight', duration: '2–3 months' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchExistingShipments();
      fetchAvailableOrders();
      generateNextBuildNumber();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && initialShipmentId) {
      loadSpecificShipment(initialShipmentId);
    }
  }, [isOpen, initialShipmentId]);  

  useEffect(() => {
    if (formData.shippingMethod && formData.estimatedDeparture) {
      calculateEstimatedDelivery();
    }
  }, [formData.shippingMethod, formData.estimatedDeparture]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchExistingShipments = async () => {
    try {
      const response = await fetch('/api/shipments?includeOrders=true');
      if (response.ok) {
        const data = await response.json();
        setExistingShipments(data.shipments || []);
      }
    } catch (error) {
      console.error('Error fetching existing shipments:', error);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (currentShipment) params.append('shipmentId', currentShipment.id);

      const url = `/api/shipments/available-orders?${params}`;
      console.log('🔍 Fetching orders from:', url);
      console.log('🔍 Current shipment:', currentShipment?.id, currentShipment?.buildNumber);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Received orders:', data.orders?.length || 0);
        console.log('📦 Orders with shipmentId:', data.orders?.filter((o: any) => o.shipmentId)?.length || 0);
        setAvailableOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching available orders:', error);
      setError('Failed to fetch available orders');
    } finally {
      setLoading(false);
    }
  };

  const generateNextBuildNumber = async () => {
    try {
      const response = await fetch('/api/shipments');
      if (response.ok) {
        const data = await response.json();
        const shipments = data.shipments || [];
        const nextNumber = shipments.length + 1;
        setFormData(prev => ({ 
          ...prev, 
          buildNumber: `SB${String(nextNumber).padStart(4, '0')}` 
        }));
      }
    } catch (error) {
      console.error('Error generating build number:', error);
    }
  };

  const loadSpecificShipment = async (shipmentId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${shipmentId}`);
      if (response.ok) {
        const data = await response.json();
        const shipment = data.shipment;
        if (shipment) {
          setCurrentShipment(shipment);
          // Auto-select this shipment's orders
          if (shipment.orders) {
            setSelectedOrders(new Set(shipment.orders.map((order: Order) => order.id)));
          }
        }
      }
    } catch (error) {
      console.error('Error loading specific shipment:', error);
      setError('Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedDelivery = () => {
    if (!formData.estimatedDeparture || !formData.shippingMethod) return;

    const departure = new Date(formData.estimatedDeparture);
    let deliveryDays = 0;

    switch (formData.shippingMethod) {
      case 'PRIORITY_FEDEX': deliveryDays = 5; break;
      case 'SAVER_UPS': deliveryDays = 10; break;
      case 'AIR_FREIGHT': deliveryDays = 17; break;
      case 'SEA_FREIGHT': deliveryDays = 75; break;
    }

    const delivery = new Date(departure);
    delivery.setDate(delivery.getDate() + deliveryDays);
    
    setFormData(prev => ({
      ...prev,
      estimatedDelivery: delivery.toISOString().split('T')[0]
    }));
  };

  const handleCreateShipment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdBy: 'admin' // This should come from user context
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentShipment(data.shipment);
        setShowCreateForm(false);
        await fetchExistingShipments();
        // Reset form
        setFormData({
          buildNumber: '',
          shippingMethod: 'PRIORITY_FEDEX',
          estimatedDeparture: '',
          estimatedDelivery: '',
          notes: ''
        });
        await generateNextBuildNumber();
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to create shipment');
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      setError('Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleEditShipment = async () => {
    if (!editingShipment) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/shipments/${editingShipment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setShowEditForm(false);
        setEditingShipment(null);
        await fetchExistingShipments();
        
        // Update current shipment if it's the one being edited
        if (currentShipment?.id === editingShipment.id) {
          setCurrentShipment(data.shipment);
        }
        
        // Reset form
        setFormData({
          buildNumber: '',
          shippingMethod: 'PRIORITY_FEDEX',
          estimatedDeparture: '',
          estimatedDelivery: '',
          notes: ''
        });
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to update shipment');
      }
    } catch (error) {
      console.error('Error updating shipment:', error);
      setError('Failed to update shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = async (shipment: Shipment) => {
    setEditingShipment(shipment);
    setCurrentShipment(shipment); // Set current shipment so orders are fetched for this shipment
    setFormData({
      buildNumber: shipment.buildNumber,
      shippingMethod: shipment.shippingMethod,
      estimatedDeparture: shipment.estimatedDeparture ? new Date(shipment.estimatedDeparture).toISOString().split('T')[0] : '',
      estimatedDelivery: shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toISOString().split('T')[0] : '',
      notes: shipment.notes || ''
    });
    setShowEditForm(true);
    setShowCreateForm(false);
    
    // Fetch orders for this specific shipment
    await fetchAvailableOrders();
  };

  const handleDeleteShipment = async (shipmentId: string) => {
    if (!confirm('Are you sure you want to delete this shipment? All assigned orders will be unassigned.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchExistingShipments();
        await fetchAvailableOrders();
        
        // Clear current shipment if it was deleted
        if (currentShipment?.id === shipmentId) {
          setCurrentShipment(null);
        }
        
        if (onRefreshOrders) onRefreshOrders();
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to delete shipment');
      }
    } catch (error) {
      console.error('Error deleting shipment:', error);
      setError('Failed to delete shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOrders = async () => {
    if (!currentShipment || selectedOrders.size === 0) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${currentShipment.id}/assign-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentShipment(data.shipment);
        setSelectedOrders(new Set());
        await fetchAvailableOrders();
        await fetchExistingShipments();
        if (onRefreshOrders) onRefreshOrders();
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to assign orders');
      }
    } catch (error) {
      console.error('Error assigning orders:', error);
      setError('Failed to assign orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await fetchAvailableOrders();
        await fetchExistingShipments();
        
        // Update current shipment data
        if (currentShipment) {
          const updatedShipment = await fetch(`/api/shipments/${currentShipment.id}`);
          if (updatedShipment.ok) {
            const data = await updatedShipment.json();
            setCurrentShipment(data.shipment);
          }
        }
        
        if (onRefreshOrders) onRefreshOrders();
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to unassign order');
      }
    } catch (error) {
      console.error('Error unassigning order:', error);
      setError('Failed to unassign order');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAllOrders = () => {
    if (selectedOrders.size === availableOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(availableOrders.map(order => order.id)));
    }
  };

  const getShippingIcon = (method: string) => {
    switch (method) {
      case 'PRIORITY_FEDEX':
      case 'SAVER_UPS':
        return <Truck className="w-4 h-4" />;
      case 'AIR_FREIGHT':
        return <Plane className="w-4 h-4" />;
      case 'SEA_FREIGHT':
        return <Ship className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getMethodLabel = (method: string) => {
    const methodInfo = shippingMethods.find(m => m.value === method);
    return methodInfo ? methodInfo.label : method;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateTotalQuantity = (orders: Order[]) => {
    return orders.reduce((total, order) => {
      const selectedColors = order.selectedColors as any;
      const selectedOptions = order.selectedOptions as any;
      const multiSelectOptions = order.multiSelectOptions as any;
      let orderQuantity = 0;
      
      // Method 1: Try selectedColors.colorName.sizes.sizeValue structure
      if (selectedColors && typeof selectedColors === 'object') {
        Object.values(selectedColors).forEach((colorData: any) => {
          if (colorData && colorData.sizes && typeof colorData.sizes === 'object') {
            Object.values(colorData.sizes).forEach((quantity: any) => {
              orderQuantity += parseInt(quantity.toString()) || 0;
            });
          }
        });
      }
      
      // Method 2: Try selectedOptions.quantity
      if (orderQuantity === 0 && selectedOptions?.quantity) {
        orderQuantity = parseInt(selectedOptions.quantity.toString()) || 0;
      }
      
      // Method 3: Try multiSelectOptions.quantity
      if (orderQuantity === 0 && multiSelectOptions?.quantity) {
        orderQuantity = parseInt(multiSelectOptions.quantity.toString()) || 0;
      }
      
      // Method 4: Search for any field containing quantity
      if (orderQuantity === 0) {
        const allFields = [selectedColors, selectedOptions, multiSelectOptions];
        allFields.forEach((field) => {
          if (field && typeof field === 'object') {
            Object.entries(field).forEach(([key, value]) => {
              if (key.toLowerCase().includes('quantity') || key.toLowerCase().includes('qty')) {
                const qty = parseInt(value?.toString()) || 0;
                if (qty > 0) orderQuantity += qty;
              }
            });
          }
        });
      }
      
      // Fallback to 1 if no quantity found
      return total + (orderQuantity || 1);
    }, 0);
  };

  const filteredOrders = availableOrders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerInfo.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-in-up">
      <div className="bg-black/80 border border-white/10 rounded-2xl w-full max-w-7xl mx-4 max-h-[90vh] overflow-hidden backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Package className="w-6 h-6 text-lime-400" />
              Shipment Builder
              <div className="h-1 w-16 bg-lime-400 rounded-full"></div>
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-slate-400">
                Create and assign shipping batches to grouped orders
              </p>
              {currentShipment && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lime-400 font-medium">
                    {currentShipment.buildNumber}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-orange-400 font-medium">
                    {calculateTotalQuantity(currentShipment.orders)} total units
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Shipment Creation */}
            <div className="space-y-6">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {showEditForm ? 'Edit Shipment' : 'Shipment Creation'}
                  </h3>
                  {!showCreateForm && !showEditForm && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowCreateForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Shipment
                    </Button>
                  )}
                </div>

                {(showCreateForm || showEditForm) && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Shipment Build Number
                      </label>
                      <input
                        type="text"
                        value={formData.buildNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, buildNumber: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-white/10 bg-black/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                        placeholder="SB0001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Shipping Method
                      </label>
                      <select
                        value={formData.shippingMethod}
                        onChange={(e) => setFormData(prev => ({ ...prev, shippingMethod: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-white/10 bg-black/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                      >
                        {shippingMethods.map(method => (
                          <option key={method.value} value={method.value} className="bg-black/80 text-white">
                            {method.label} – {method.duration}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-400 mt-1">
                        Estimated Delivery Duration: {shippingMethods.find(m => m.value === formData.shippingMethod)?.duration}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Estimated Flight/Departure Date
                        </label>
                        <input
                          type="date"
                          value={formData.estimatedDeparture}
                          onChange={(e) => setFormData(prev => ({ ...prev, estimatedDeparture: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-white/10 bg-black/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Estimated Delivery Date
                        </label>
                        <input
                          type="date"
                          value={formData.estimatedDelivery}
                          onChange={(e) => setFormData(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-white/10 bg-black/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                        />
                        <p className="text-xs text-slate-400 mt-1">Auto-calculated but editable</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-white/10 bg-black/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                        rows={3}
                        placeholder="Add any additional notes for this shipment..."
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="primary"
                        onClick={showEditForm ? handleEditShipment : handleCreateShipment}
                        disabled={loading || !formData.buildNumber}
                      >
                        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {showEditForm ? 'Update Shipment' : 'Save & Exit'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowCreateForm(false);
                          setShowEditForm(false);
                          setEditingShipment(null);
                          setFormData({
                            buildNumber: '',
                            shippingMethod: 'PRIORITY_FEDEX',
                            estimatedDeparture: '',
                            estimatedDelivery: '',
                            notes: ''
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Existing Shipments */}
              <GlassCard className="p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Active Shipment Builds</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {existingShipments.map(shipment => (
                    <div
                      key={shipment.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        currentShipment?.id === shipment.id
                          ? 'bg-lime-400/10 border-lime-400/40'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => setCurrentShipment(shipment)}
                        >
                          {getShippingIcon(shipment.shippingMethod)}
                          <div>
                            <div className="font-medium text-white">{shipment.buildNumber}</div>
                            <div className="text-xs text-slate-400">
                              {getMethodLabel(shipment.shippingMethod)} • {calculateTotalQuantity(shipment.orders)} units
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <div className="text-xs text-slate-400">
                              ETA: {shipment.estimatedDelivery ? formatDate(shipment.estimatedDelivery) : 'TBD'}
                            </div>
                            <StatusBadge status={shipment.status} />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(shipment);
                            }}
                            className="p-1 h-8 w-8"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteShipment(shipment.id);
                            }}
                            className="p-1 h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* Right Column - Order Assignment */}
            <div className="space-y-6">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Assign Orders to Shipment</h3>
                  {currentShipment && (
                    <div className="text-sm text-slate-400">
                      Active: {currentShipment.buildNumber}
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <SearchInput
                      icon={Search}
                      placeholder="Search orders, customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-black/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                  >
                    <option value="all" className="bg-black/80 text-white">All Status</option>
                    <option value="pending" className="bg-black/80 text-white">Pending</option>
                    <option value="processing" className="bg-black/80 text-white">Processing</option>
                    <option value="confirmed" className="bg-black/80 text-white">Confirmed</option>
                  </select>
                </div>

                {/* Bulk Actions */}
                {selectedOrders.size > 0 && currentShipment && (
                  <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-300">
                        {selectedOrders.size} orders selected
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAssignOrders}
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700 border-orange-500"
                      >
                        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                        Assign to Current Shipping Build
                      </Button>
                    </div>
                  </div>
                )}

                {/* Orders Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableHeaderCell>
                        <input
                          type="checkbox"
                          checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                          onChange={handleSelectAllOrders}
                          className="rounded border-white/20 bg-white/10 text-lime-400 focus:ring-lime-400/50"
                        />
                      </TableHeaderCell>
                      <TableHeaderCell>Order ID</TableHeaderCell>
                      <TableHeaderCell>Customer</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Created</TableHeaderCell>
                      <TableHeaderCell align="right">Action</TableHeaderCell>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-lime-400" />
                            <p className="text-slate-400 mt-2">Loading orders...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Package className="w-8 h-8 mx-auto text-slate-400" />
                            <p className="text-slate-400 mt-2">No orders available</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map(order => {
                          const isAssignedToCurrentShipment = order.shipmentId === currentShipment?.id;
                          return (
                            <TableRow 
                              key={order.id} 
                              className={`hover:bg-white/5 ${
                                isAssignedToCurrentShipment ? 'bg-lime-400/5 border-l-2 border-lime-400/40' : ''
                              }`}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedOrders.has(order.id)}
                                  onChange={() => handleSelectOrder(order.id)}
                                  className="rounded border-white/20 bg-white/10 text-lime-400 focus:ring-lime-400/50"
                                />
                              </TableCell>
                            <TableCell className="font-medium text-white">
                              #{order.id.slice(-8)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="text-white font-medium">{order.customerInfo.name}</div>
                                <div className="text-xs text-slate-400">{order.customerInfo.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white/5 border border-white/10">
                                {order.orderSource.replace('_', ' ')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={order.status} />
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-slate-400">
                                {formatDate(order.createdAt)}
                              </div>
                            </TableCell>
                            <TableCell align="right">
                              {isAssignedToCurrentShipment ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-lime-400 font-medium">In This Build</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUnassignOrder(order.id)}
                                    disabled={loading}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 text-xs"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : order.shipmentId ? (
                                <span className="text-xs text-slate-500">Assigned to Other</span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (currentShipment) {
                                      setSelectedOrders(new Set([order.id]));
                                      handleAssignOrders();
                                    }
                                  }}
                                  disabled={!currentShipment || loading}
                                >
                                  Assign
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}