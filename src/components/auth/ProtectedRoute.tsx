'use client';

import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAccessRole?: 'CUSTOMER' | 'STAFF' | 'SUPER_ADMIN' | 'MASTER_ADMIN';
  requiredCustomerRole?: 'RETAIL' | 'WHOLESALE' | 'SUPPLIER';
}

export default function ProtectedRoute({ children, requiredAccessRole, requiredCustomerRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=' + window.location.pathname);
    }

    // Check access role if required
    if (!loading && requiredAccessRole && user?.accessRole !== requiredAccessRole) {
      router.push('/unauthorized');
    }

    // Check customer role if required
    if (!loading && requiredCustomerRole && user?.customerRole !== requiredCustomerRole) {
      router.push('/unauthorized');
    }
  }, [loading, isAuthenticated, user, router, requiredAccessRole, requiredCustomerRole]);

  if (loading) {
    return (
      <div className="relative min-h-screen text-slate-200 bg-black">
        {/* Background Glows */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 h-[480px] w-[480px] rounded-full bg-lime-400/15 blur-[120px]" />
          <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-purple-500/15 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.035),_transparent_60%)]" />
        </div>
        
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <svg className="animate-spin h-8 w-8 text-lime-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-slate-300 text-lg">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredAccessRole && user?.accessRole !== requiredAccessRole) {
    return null;
  }

  return <>{children}</>;
}
