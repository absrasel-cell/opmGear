import { supabaseAdmin } from './supabase';

// Note: This file contains deprecated shipment functionality
// Consider removing or implementing with Supabase when shipment features are re-enabled

interface ShipmentWithOrders {
  id: string;
  buildNumber: string;
  shippingMethod: string;
  estimatedDeparture: Date | null;
  estimatedDelivery: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  orders: Array<{
    id: string;
    productName: string;
    customerInfo: any;
    status: string;
    totalUnits?: number;
    calculatedTotal?: number;
  }>;
}

interface OrderWithShipment {
  id: string;
  productName: string;
  customerInfo: any;
  status: string;
  totalUnits?: number;
  calculatedTotal?: number;
  shipmentId?: string;
  shipment?: {
    id: string;
    buildNumber: string;
    shippingMethod: string;
    estimatedDeparture: Date | null;
    estimatedDelivery: Date | null;
    status: string;
  };
}

// SHIPPING METHODS CONFIGURATION
export const SHIPPING_METHODS = {
  AIR_FREIGHT: {
    method: 'AIR_FREIGHT',
    displayName: 'Air Freight',
    estimatedDays: '15-20 days',
    costMultiplier: 1.0,
    description: 'Standard air delivery'
  },
  SEA_FREIGHT: {
    method: 'SEA_FREIGHT',
    displayName: 'Sea Freight',
    estimatedDays: '2-3 months',
    costMultiplier: 0.7,
    description: 'Most economical option'
  }
};

/**
 * DEPRECATED: All shipment functions have been disabled pending Supabase migration
 * TODO: Implement with Supabase or remove if feature is no longer needed
 */

export async function getActiveShipments(): Promise<ShipmentWithOrders[]> {
  console.log('Shipment functionality temporarily disabled');
  return [];
}

export async function assignOrderToShipment(orderId: string, shipmentId: string): Promise<{ success: boolean; message: string; order?: any }> {
  console.log('Shipment functionality temporarily disabled');
  return { success: false, message: 'Shipment functionality temporarily disabled' };
}

export async function createNewShipment(orderIds: string[], shippingMethod: keyof typeof SHIPPING_METHODS): Promise<{ success: boolean; message: string; shipment?: any }> {
  console.log('Shipment functionality temporarily disabled');
  return { success: false, message: 'Shipment functionality temporarily disabled' };
}

export async function removeOrderFromShipment(orderId: string): Promise<{ success: boolean; message: string }> {
  console.log('Shipment functionality temporarily disabled');
  return { success: false, message: 'Shipment functionality temporarily disabled' };
}

export async function getShipmentAnalytics(): Promise<{
  totalShipments: number;
  averageUtilization: number;
  monthlyValue: number;
  potentialSavings: number;
  recentShipments: any[];
}> {
  console.log('Shipment analytics temporarily disabled');
  return {
    totalShipments: 0,
    averageUtilization: 0,
    monthlyValue: 0,
    potentialSavings: 0,
    recentShipments: []
  };
}

export function calculateShipmentUtilization(orders: any[]): number {
  return 0; // Placeholder
}

export function calculateShipmentValue(orders: any[]): number {
  return 0; // Placeholder
}