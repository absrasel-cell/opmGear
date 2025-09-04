'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import {
  DashboardShell,
  DashboardContent,
  GlassCard,
  Button
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';
import DashboardHeader from '@/components/ui/dashboard/DashboardHeader';
import { Database, ExternalLink, RefreshCw } from 'lucide-react';

export default function PrismaDBPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [prismaUrl, setPrismaUrl] = useState<string>('');
  const [isLoadingPrisma, setIsLoadingPrisma] = useState(true);

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

    // Set Prisma Studio URL - typically runs on port 5555
    setPrismaUrl('http://localhost:5555');
    setIsLoadingPrisma(false);
  }, [user, loading, isAuthenticated, router]);

  const refreshPrismaStudio = () => {
    setIsLoadingPrisma(true);
    // Reload the iframe
    const iframe = document.getElementById('prisma-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
    setTimeout(() => setIsLoadingPrisma(false), 2000);
  };

  const openInNewTab = () => {
    window.open(prismaUrl, '_blank');
  };

  const isMasterAdmin = user?.email === 'absrasel@gmail.com';
  
  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading Prisma DB...</p>
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
            <p className="text-slate-300 mb-4">You need admin privileges to access Prisma DB.</p>
            <Button variant="primary" onClick={() => router.push('/dashboard/member')}>
              Go to Member Dashboard
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex" style={{ marginTop: '50px' }}>
        {/* Sidebar */}
        <Sidebar 
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <DashboardContent>
          {/* Content wrapper with proper spacing */}
          <div className="mt-10">
            {/* Header */}
          <DashboardHeader
            title="Prisma Database Studio"
            subtitle="Manage and visualize your database with Prisma Studio"
          />

          {/* Prisma Studio Interface */}
          <section className="px-6 md:px-10 mt-6 flex-1">
            <GlassCard className="h-full overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-lime-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Prisma Studio</h2>
                    <p className="text-sm text-slate-400">Database management interface</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    className="px-3 py-1.5 text-xs"
                    onClick={refreshPrismaStudio}
                    disabled={isLoadingPrisma}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingPrisma ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="px-3 py-1.5 text-xs bg-lime-400/10 text-lime-200 border-lime-400/20"
                    onClick={openInNewTab}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open in New Tab
                  </Button>
                </div>
              </div>

              {/* Loading State */}
              {isLoadingPrisma && (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
                    <p className="mt-4 text-slate-300">Loading Prisma Studio...</p>
                  </div>
                </div>
              )}

              {/* Prisma Studio Iframe */}
              {prismaUrl && (
                <div className={`${isLoadingPrisma ? 'hidden' : 'block'} h-screen`}>
                  <iframe
                    id="prisma-iframe"
                    src={prismaUrl}
                    className="w-full h-full border-0"
                    title="Prisma Studio"
                    onLoad={() => setIsLoadingPrisma(false)}
                    onError={() => {
                      setIsLoadingPrisma(false);
                      console.error('Failed to load Prisma Studio');
                    }}
                  />
                </div>
              )}

              {/* Fallback when no URL is available */}
              {!prismaUrl && !isLoadingPrisma && (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <Database className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-300 mb-2">Prisma Studio URL not configured</p>
                    <p className="text-slate-400 text-sm">Check the setup instructions below</p>
                  </div>
                </div>
              )}

              {/* Connection Instructions */}
              <div className="p-6 border-t border-white/10 bg-white/5">
                <div className="text-sm text-slate-300">
                  <p className="mb-2">
                    <strong className="text-white">Setup Instructions:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Make sure Prisma Studio is running: <code className="px-2 py-1 bg-black/20 rounded text-lime-300">npx prisma studio</code></li>
                    <li>Prisma Studio should be accessible at <code className="px-2 py-1 bg-black/20 rounded text-lime-300">http://localhost:5555</code></li>
                    <li>If the frame doesn't load, click "Open in New Tab" or check if Prisma Studio is running</li>
                  </ol>
                </div>
              </div>
            </GlassCard>
          </section>

          </div>
          {/* End content wrapper */}
        </DashboardContent>
      </div>
    </DashboardShell>
  );
}