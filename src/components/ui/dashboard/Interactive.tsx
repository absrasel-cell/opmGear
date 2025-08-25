'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, MoreHorizontal, MapPin, Receipt, Box } from 'lucide-react';
import { GlassCard, Button } from './index';
import { dashboardTheme } from '@/lib/dashboard-theme';

// ============================================================================
// DROPDOWN COMPONENT
// ============================================================================

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Dropdown({ 
  trigger, 
  children, 
  align = 'left', 
  className = '' 
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0', 
    center: 'left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className={`absolute z-20 mt-1 min-w-[150px] rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl p-1 ${alignmentClasses[align]}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ 
  children, 
  onClick,
  className = '',
  disabled = false
}: { 
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// ============================================================================
// ROLE DROPDOWN (Specific to the generated design)
// ============================================================================

interface RoleDropdownProps {
  currentRole: 'Admin' | 'Member' | 'Master Admin';
  onRoleChange: (role: string) => void;
  buttonId?: string;
}

export function RoleDropdown({ 
  currentRole, 
  onRoleChange, 
  buttonId = `roleBtn-${Math.random().toString(36).substr(2, 9)}` 
}: RoleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Master Admin': return '👑';
      case 'Admin': return '🛡️';
      case 'Member': return '👤';
      default: return '👤';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Master Admin': 
      case 'Admin': return 'text-lime-300';
      case 'Member': return 'text-slate-300';
      default: return 'text-slate-300';
    }
  };

  const handleRoleSelect = (role: string) => {
    onRoleChange(role);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs transition-colors"
      >
        <span className={`w-3.5 h-3.5 ${getRoleColor(currentRole)}`}>
          {getRoleIcon(currentRole)}
        </span>
        {currentRole}
        <ChevronDown className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-20 mt-1 min-w-[150px] rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl p-1 right-0">
          <DropdownItem onClick={() => handleRoleSelect('Admin')}>
            <span className="flex items-center gap-2">
              <span>🛡️</span> Admin
            </span>
          </DropdownItem>
          <DropdownItem onClick={() => handleRoleSelect('Member')}>
            <span className="flex items-center gap-2">
              <span>👤</span> Member
            </span>
          </DropdownItem>
          <DropdownItem onClick={() => handleRoleSelect('Master Admin')}>
            <span className="flex items-center gap-2 text-lime-300">
              <span>👑</span> Master Admin
            </span>
          </DropdownItem>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DRAWER COMPONENT
// ============================================================================

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'right' | 'left';
  size?: 'sm' | 'md' | 'lg';
}

export function Drawer({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  position = 'right',
  size = 'md'
}: DrawerProps) {
  const positionClasses = {
    right: 'right-0',
    left: 'left-0'
  };

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  };

  const transformClasses = {
    right: isOpen ? 'translate-x-0' : 'translate-x-full',
    left: isOpen ? 'translate-x-0' : '-translate-x-full'
  };

  return (
    <div className={`fixed inset-y-0 ${positionClasses[position]} w-full ${sizeClasses[size]} bg-black/60 backdrop-blur-xl border-l border-white/10 ${transformClasses[position]} transition-transform z-40 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className="h-full flex flex-col">
        {title && (
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-lime-400" />
              <div className="text-white font-semibold tracking-tight">{title}</div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TRACKING DRAWER (Specific to the generated design)
// ============================================================================

interface TrackingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  trackingInfo?: {
    carrier: string;
    eta: string;
    lastScan: string;
    trackingNumber: string;
  };
}

export function TrackingDrawer({ 
  isOpen, 
  onClose, 
  orderId,
  trackingInfo = {
    carrier: 'UPS Ground',
    eta: 'Sep 21',
    lastScan: 'Louisville, KY — 2h ago',
    trackingNumber: '1Z8F2A0XR42'
  }
}: TrackingDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Tracking — ${orderId}`}
    >
      <div className="p-4 space-y-3">
        <GlassCard className="p-3">
          <div className="text-sm text-slate-300">
            Carrier: {trackingInfo.carrier} • ETA: {trackingInfo.eta}
          </div>
        </GlassCard>
        
        <GlassCard className="p-3">
          <div className="text-sm text-slate-300">
            Last Scan: {trackingInfo.lastScan}
          </div>
        </GlassCard>
        
        <GlassCard className="p-3">
          <div className="text-sm text-slate-300">
            Tracking #: {trackingInfo.trackingNumber}
          </div>
        </GlassCard>
      </div>
    </Drawer>
  );
}

// ============================================================================
// MODAL COMPONENT (Enhanced)
// ============================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  actions?: React.ReactNode;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  icon: Icon,
  children, 
  size = 'md',
  actions
}: ModalProps) {
  if (!isOpen) return null;
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  return (
    <div className="fixed inset-0 items-center justify-center flex z-50">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div className={`relative mx-4 sm:mx-auto w-full ${sizes[size]} bg-black/70 border border-white/10 rounded-2xl overflow-hidden`}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-lime-300" />}
              <div className="text-white font-semibold tracking-tight">{title}</div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        <div className="p-5">
          {children}
        </div>
        
        {actions && (
          <div className="flex items-center justify-end gap-2 p-5 border-t border-white/10">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ORDER DETAILS MODAL (Specific to the generated design)
// ============================================================================

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: {
    id: string;
    customer: string;
    items: number;
    total: string;
    status: string;
  };
}

export function OrderDetailsModal({ 
  isOpen, 
  onClose, 
  order = {
    id: 'CC-1042',
    customer: 'Jordan Morgan',
    items: 12,
    total: '$486.00',
    status: 'Processing'
  }
}: OrderDetailsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order — ${order.id}`}
      icon={Receipt}
      actions={
        <>
          <Button variant="secondary">
            Print
          </Button>
          <Button variant="primary">
            Advance Status
          </Button>
        </>
      }
    >
      <GlassCard className="p-4">
        <div className="space-y-2 text-sm text-slate-300">
          <div>Customer: {order.customer}</div>
          <div>Items: {order.items} • Total: {order.total}</div>
          <div>Status: {order.status}</div>
        </div>
      </GlassCard>
    </Modal>
  );
}

// ============================================================================
// PRODUCT MODAL (Specific to the generated design)
// ============================================================================

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    name: string;
    sku: string;
    price: string;
    status: string;
    description: string;
  };
  onSave?: (product: any) => void;
}

export function ProductModal({ 
  isOpen, 
  onClose, 
  product,
  onSave
}: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    price: product?.price || '',
    status: product?.status || 'In Stock',
    description: product?.description || ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required.';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onSave?.(formData);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product"
      icon={Box}
      size="lg"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Save Product
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              type="text"
              placeholder="Product name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-300/40 text-sm text-white placeholder:text-slate-500"
            />
            {errors.name && (
              <div className="mt-1 text-xs text-red-400/80">{errors.name}</div>
            )}
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">SKU</label>
            <input
              type="text"
              placeholder="SKU code"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-300/40 text-sm text-white placeholder:text-slate-500"
            />
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">Price</label>
            <input
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-300/40 text-sm text-white placeholder:text-slate-500"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-300/40 text-sm text-white"
            >
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Featured">Featured</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea
              rows={4}
              placeholder="Short description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-300/40 text-sm text-white placeholder:text-slate-500 resize-none"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export { Modal as BaseModal, Dropdown as BaseDropdown, Drawer as BaseDrawer };