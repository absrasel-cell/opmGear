'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import {
 DashboardShell,
 DashboardContent,
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';
import { ProductManagement } from '../ProductManagement';

export default function AdminProductsPage() {
 const { user, loading, isAuthenticated } = useAuth();
 const router = useRouter();
 
 // State
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

 // Check admin access
 useEffect(() => {
  if (loading) return;
  
  if (!isAuthenticated || !user) {
   router.push('/login');
   return;
  }
  
  const isMasterAdmin = user.email === 'absrasel@gmail.com' || user.email === 'vic@onpointmarketing.com';
  if (user.role !== 'ADMIN' && !isMasterAdmin) {
   router.push('/dashboard/member');
   return;
  }
 }, [user, loading, isAuthenticated, router]);

 const isMasterAdmin = user?.email === 'absrasel@gmail.com' || user?.email === 'vic@onpointmarketing.com';
 
 if (loading) {
  return (
   <DashboardShell>
    <div className="flex items-center justify-center min-h-screen">
     <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
      <p className="mt-4 text-slate-300">Loading Products Management...</p>
     </div>
    </div>
   </DashboardShell>
  );
 }

 if (!isAuthenticated || !user || (user.role !== 'ADMIN' && !isMasterAdmin)) {
  return (
   <DashboardShell>
    <div className="flex items-center justify-center min-h-screen">
     <div className="text-center">
      <div className="text-red-400 text-6xl mb-4">🚫</div>
      <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
      <p className="text-slate-300 mb-4">You need admin privileges to access this page.</p>
     </div>
    </div>
   </DashboardShell>
  );
 }

 return (
  <DashboardShell>
   <div className="flex">
    {/* Sidebar */}
    <Sidebar 
     collapsed={sidebarCollapsed}
     onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
    />

    {/* Main Content */}
    <DashboardContent>
     {/* Header */}
     <DashboardHeader
      title="Product Management"
      subtitle="Create, edit, and manage your product catalog with full customization options."
      onSearch={(query) => console.log('Search:', query)}
      sticky={false}
     />

     {/* Content wrapper with proper margin */}
     <div className="mt-8">
      {/* Product Management Component */}
      <ProductManagement />
     </div>
     {/* End content wrapper */}
    </DashboardContent>
   </div>
  </DashboardShell>
 );
}
