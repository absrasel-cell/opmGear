'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MessagesPanel from '@/components/ui/dashboard/MessagesPanel';
import { DashboardShell, DashboardContent } from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';

export default function MessagesPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    const isMasterAdmin = user.email === 'absrasel@gmail.com';
    if (user.accessRole !== 'SUPER_ADMIN' && user.accessRole !== 'MASTER_ADMIN' && !isMasterAdmin) {
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
            <p className="mt-4 text-slate-300">Loading Messages...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthenticated || !user || (user.accessRole !== 'SUPER_ADMIN' && user.accessRole !== 'MASTER_ADMIN' && user.email !== 'absrasel@gmail.com')) {
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
        <Sidebar />

        {/* Main Content */}
        <DashboardContent>
          {/* Header */}
          <DashboardHeader
            title="Messages"
            subtitle="Manage customer support and inquiries"
            onSearch={(query) => console.log('Search:', query)}
            sticky={false}
            primaryActionText=""
            showNewQuote={false}
            showProfile={false}
          />

          {/* Content wrapper with proper margin */}
          <div className="mt-0">

          {/* Messages Panel */}
          <section className="px-6 md:px-10 mt-6">
            <div className="h-[calc(100vh-300px)]">
              <MessagesPanel />
            </div>
          </section>

          </div>
          {/* End content wrapper */}
        </DashboardContent>
      </div>
    </DashboardShell>
  );
}
