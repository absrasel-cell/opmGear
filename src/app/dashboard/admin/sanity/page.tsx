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
import { Edit3, ExternalLink, RefreshCw } from 'lucide-react';

export default function SanityCMSPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sanityUrl, setSanityUrl] = useState<string>('');
  const [isLoadingSanity, setIsLoadingSanity] = useState(true);

  // Check admin access
  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    const isMasterAdmin = user.email === 'absrasel@gmail.com';
    if (user.role !== 'ADMIN' && !isMasterAdmin) {
      router.push('/dashboard/member');
      return;
    }

    // Set Sanity Studio URL - using the project ID from sanity.config.ts
    const projectId = '62anct3y';
    const dataset = 'production';
    // Use the correct Sanity Studio URL format
    setSanityUrl(`https://${projectId}.sanity.studio`);
    setIsLoadingSanity(false);
  }, [user, loading, isAuthenticated, router]);

  const refreshSanityStudio = () => {
    setIsLoadingSanity(true);
    // Reload the iframe
    const iframe = document.getElementById('sanity-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
    setTimeout(() => setIsLoadingSanity(false), 2000);
  };

  const openInNewTab = () => {
    window.open(sanityUrl, '_blank');
  };

  const openLocalStudio = () => {
    window.open('http://localhost:3333', '_blank');
  };

  const isMasterAdmin = user?.email === 'absrasel@gmail.com';
  
  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading Sanity CMS...</p>
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
            <p className="text-slate-300 mb-4">You need admin privileges to access Sanity CMS.</p>
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
            title="Sanity CMS Studio"
            subtitle="Manage your content with Sanity Studio"
          />

          {/* Sanity Studio Interface */}
          <section className="px-6 md:px-10 mt-6 flex-1">
            <GlassCard className="h-full overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Edit3 className="w-6 h-6 text-lime-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Sanity Studio</h2>
                    <p className="text-sm text-slate-400">Content management system</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    className="px-3 py-1.5 text-xs"
                    onClick={refreshSanityStudio}
                    disabled={isLoadingSanity}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingSanity ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="px-3 py-1.5 text-xs bg-orange-400/10 text-orange-200 border-orange-400/20"
                    onClick={openLocalStudio}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Local Studio
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="px-3 py-1.5 text-xs bg-lime-400/10 text-lime-200 border-lime-400/20"
                    onClick={openInNewTab}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Cloud Studio
                  </Button>
                </div>
              </div>

              {/* Loading State */}
              {isLoadingSanity && (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
                    <p className="mt-4 text-slate-300">Loading Sanity Studio...</p>
                  </div>
                </div>
              )}

              {/* Sanity Studio Iframe */}
              {sanityUrl && (
                <div className={`${isLoadingSanity ? 'hidden' : 'block'} h-screen`}>
                  <iframe
                    id="sanity-iframe"
                    src={sanityUrl}
                    className="w-full h-full border-0 bg-slate-900"
                    title="Sanity Studio"
                    onLoad={(e) => {
                      setIsLoadingSanity(false);
                      // Check if iframe loaded successfully
                      try {
                        const iframe = e.target as HTMLIFrameElement;
                        if (iframe.contentDocument?.title.includes('Not Found') || 
                            iframe.contentDocument?.body?.textContent?.includes('Studio not found')) {
                          console.warn('Sanity Studio not accessible at cloud URL');
                        }
                      } catch (error) {
                        // Cross-origin restrictions prevent access to iframe content
                        console.log('Sanity Studio loaded (cross-origin)');
                      }
                    }}
                    onError={() => {
                      setIsLoadingSanity(false);
                      console.error('Failed to load Sanity Studio');
                    }}
                  />
                </div>
              )}

              {/* Fallback when no URL is available or Studio not accessible */}
              {!sanityUrl && !isLoadingSanity && (
                <div className="flex items-center justify-center h-96 bg-slate-900/20">
                  <div className="text-center p-8">
                    <Edit3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-white mb-2 font-medium">Sanity Cloud Studio</p>
                    <p className="text-slate-300 text-sm mb-4">
                      {!sanityUrl ? 'Studio URL not configured' : 'Cloud Studio may not be accessible yet'}
                    </p>
                    <div className="space-y-2">
                      <Button 
                        variant="ghost" 
                        className="px-4 py-2 text-sm bg-lime-400/10 text-lime-200 border-lime-400/20"
                        onClick={openLocalStudio}
                      >
                        Try Local Studio Instead
                      </Button>
                      {sanityUrl && (
                        <Button 
                          variant="ghost" 
                          className="px-4 py-2 text-sm text-slate-300"
                          onClick={openInNewTab}
                        >
                          Open Cloud Studio in New Tab
                        </Button>
                      )}
                    </div>
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
                    <li>For local development: Run <code className="px-2 py-1 bg-black/20 rounded text-lime-300">npx sanity dev</code> (usually on port 3333)</li>
                    <li>Cloud Studio URL: <code className="px-2 py-1 bg-black/20 rounded text-lime-300">https://62anct3y.sanity.studio</code></li>
                    <li>Local Studio works immediately - Cloud Studio requires Sanity project setup</li>
                    <li>Production deployment: Cloud Studio will work when your domain is deployed and Sanity is properly configured</li>
                    <li>Make sure you're logged in to Sanity to access both Local and Cloud Studio</li>
                  </ol>
                  
                  <div className="mt-4 p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg">
                    <p className="text-amber-200 text-xs">
                      <strong>Production Note:</strong> When deployed to a live domain (not localhost), Sanity Cloud Studio will work correctly. 
                      The 404 error is expected in development when the Sanity project isn't fully configured for cloud access.
                    </p>
                  </div>
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