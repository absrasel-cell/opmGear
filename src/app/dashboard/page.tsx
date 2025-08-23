'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Redirect based on user access role
    const isAdmin = ['SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF'].includes(
      // @ts-ignore - user is provided by AuthContext with accessRole
      (user as any).accessRole
    );
    if (isAdmin) {
      router.push('/dashboard/admin');
    } else {
      router.push('/dashboard/member');
    }
  }, [user, loading, isAuthenticated, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
