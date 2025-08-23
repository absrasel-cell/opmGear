'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardSidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    router.push('/logout');
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-white w-64 shadow-lg transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-8">
            <div className="text-sm font-medium text-gray-500">Welcome,</div>
            <div className="text-lg font-semibold text-gray-800">
              {user?.name || 'User'}
            </div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>

          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
            >
              Overview
            </Link>
            <Link
              href="/dashboard/orders"
              className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
            >
              Orders
            </Link>
            <Link
              href="/dashboard/designs"
              className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
            >
              Saved Designs
            </Link>
            <Link
              href="/dashboard/settings"
              className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
            >
              Settings
            </Link>
            {user?.role === 'admin' && (
              <>
                <div className="my-4 border-t border-gray-200"></div>
                <Link
                  href="/dashboard/admin/users"
                  className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                >
                  Manage Users
                </Link>
                <Link
                  href="/dashboard/admin/products"
                  className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                >
                  Manage Products
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-20"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </>
  );
}
