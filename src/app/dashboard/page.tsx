'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    console.log('🎯 Dashboard routing - loading:', loading, 'isAuthenticated:', isAuthenticated, 'user:', user?.email, 'accessRole:', (user as any)?.accessRole);
    
    // Prevent multiple redirects
    if (hasRedirected) {
      console.log('🚫 Dashboard: Already redirected, skipping...');
      return;
    }

    if (loading) {
      console.log('⏳ Dashboard: Still loading, waiting...');
      return; // Wait for auth to load
    }

    if (!isAuthenticated || !user) {
      console.log('❌ Dashboard: Not authenticated, redirecting to login');
      const currentPath = window.location.pathname + window.location.search;
      router.push('/login?redirect=' + encodeURIComponent(currentPath));
      setHasRedirected(true);
      return;
    }

    // Wait for complete user data including accessRole
    const userAccessRole = (user as any).accessRole;
    console.log('🔍 Dashboard: User access role:', userAccessRole, 'type:', typeof userAccessRole);
    
    // If accessRole is not loaded yet, wait for it
    if (!userAccessRole || userAccessRole === undefined) {
      console.log('⏳ Dashboard: AccessRole not loaded yet, waiting for complete user data...');
      return;
    }
    
    const isAdmin = ['SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF'].includes(userAccessRole);
    console.log('🚪 Dashboard: Is admin check:', isAdmin, 'for role:', userAccessRole);
    
    if (isAdmin) {
      console.log('✅ Dashboard: Redirecting to admin dashboard');
      router.push('/dashboard/admin');
      setHasRedirected(true);
    } else {
      console.log('👤 Dashboard: Redirecting to member dashboard');  
      router.push('/dashboard/member');
      setHasRedirected(true);
    }
  }, [user, loading, isAuthenticated, router, hasRedirected]);

  // Show appropriate loading state
  const showLoadingState = loading || !user || !isAuthenticated || !(user as any)?.accessRole;
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto"></div>
        <p className="mt-4 text-slate-300">
          {loading || !isAuthenticated ? 'Loading your account...' : 
           !user ? 'Authenticating...' :
           !(user as any)?.accessRole ? 'Loading dashboard preferences...' :
           'Redirecting to your dashboard...'}
        </p>
        {user && (
          <p className="mt-2 text-slate-400 text-sm">Welcome back, {user.email}</p>
        )}
      </div>
    </div>
  );
}
