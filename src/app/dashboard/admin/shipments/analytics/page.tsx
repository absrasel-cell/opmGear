'use client';

import React from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';

import {
  DashboardShell,
  DashboardContent,
  Button
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';
import ShipmentAnalytics from '@/components/ui/dashboard/ShipmentAnalytics';

export default function ShipmentAnalyticsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    const isMasterAdmin = user.email === 'absrasel@gmail.com' || user.email === 'vic@onpointmarketing.com';
    if (user.accessRole !== 'SUPER_ADMIN' && user.accessRole !== 'STAFF' && !isMasterAdmin) {
      router.push('/dashboard/member');
      return;
    }
  }, [user, loading, isAuthenticated, router]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading Shipment Analytics...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const isMasterAdmin = user?.email === 'absrasel@gmail.com';
  
  if (!isAuthenticated || !user || (user.accessRole !== 'SUPER_ADMIN' && user.accessRole !== 'STAFF' && !isMasterAdmin)) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-400 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-300 mb-4">You need admin privileges to access shipment analytics.</p>
            <Link href="/dashboard/member">
              <Button variant="primary">Go to Member Dashboard</Button>
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <DashboardContent>
          {/* Header */}
          <DashboardHeader
            title="Shipment Analytics & Reporting"
            subtitle="Advanced insights for volume utilization, cost optimization, and delivery efficiency"
            onSearch={(query) => console.log('Search:', query)}
            sticky={true}
            showProfile={false}
          />

          {/* Navigation Breadcrumb */}
          <div className="px-6 md:px-10 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/dashboard/admin" className="text-lime-400 hover:text-lime-300 transition-colors">
                Dashboard
              </Link>
              <span className="text-slate-400">/</span>
              <Link href="/dashboard/admin/orders" className="text-lime-400 hover:text-lime-300 transition-colors">
                Orders
              </Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-300">Shipment Analytics</span>
            </div>
          </div>

          {/* Content wrapper with proper margin */}
          <div className="mt-8 px-6 md:px-10">
            {/* Back Button */}
            <div className="mb-6">
              <Link href="/dashboard/admin/orders">
                <Button variant="ghost" className="group">
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to Orders
                </Button>
              </Link>
            </div>

            {/* Main Analytics Component */}
            <ShipmentAnalytics />
          </div>

          {/* Footer */}
          <footer className="px-6 md:px-10 mt-12 pb-6">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6"></div>
            <div className="text-center text-slate-400 text-sm">
              <p>© 2024 CustomCap. Advanced shipment analytics powered by data insights.</p>
            </div>
          </footer>
        </DashboardContent>
      </div>
    </DashboardShell>
  );
}