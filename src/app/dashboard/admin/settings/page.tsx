'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Settings,
  ArrowLeft,
  User,
  Lock,
  Bell,
  Shield,
  Database,
  Globe
} from 'lucide-react';

// Import dashboard components
import {
  DashboardShell,
  DashboardContent,
  GlassCard,
  Button
} from '@/components/ui/dashboard';
import Sidebar from '@/components/ui/dashboard/Sidebar';

export default function AdminSettingsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const accessRole = user?.accessRole;
  const isMasterAdmin = accessRole === 'MASTER_ADMIN';
  const isAdmin = isMasterAdmin || accessRole === 'SUPER_ADMIN' || accessRole === 'STAFF';

  useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user || !isAdmin) {
      router.push('/login');
      return;
    }
  }, [user, loading, isAuthenticated, isAdmin, router]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
            <p className="mt-4 text-slate-300">Loading admin settings...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!user || !isAuthenticated || !isAdmin) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access Required</h1>
            <p className="text-slate-300 mb-6">You need admin privileges to access this page.</p>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="mt-6">
          <Sidebar 
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main Content */}
        <DashboardContent>
          {/* Header */}
          <header className="sticky top-0 z-20 backdrop-blur-xl mt-6">
            <div className="px-6 md:px-10 pt-4">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => router.push('/dashboard/admin')}
                      className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                      Back to Admin Dashboard
                    </button>
                  </div>
                  <h1 className="text-3xl font-bold text-white">Admin Settings</h1>
                  <div className="w-32"></div>
                </div>
              </GlassCard>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 px-6 md:px-10 py-6">
            <div className="max-w-4xl mx-auto">
              
              {/* Admin Settings Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* User Management Settings */}
                <GlassCard className="p-6 hover:translate-y-[-2px] transition-transform duration-200 cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-lime-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">User Management</h3>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    Configure user roles, permissions, and account policies
                  </p>
                  <Button variant="secondary" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </GlassCard>

                {/* Security Settings */}
                <GlassCard className="p-6 hover:translate-y-[-2px] transition-transform duration-200 cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Security</h3>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    Manage authentication, access controls, and security policies
                  </p>
                  <Button variant="secondary" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </GlassCard>

                {/* System Notifications */}
                <GlassCard className="p-6 hover:translate-y-[-2px] transition-transform duration-200 cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                      <Bell className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Notifications</h3>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    Configure system alerts, email templates, and notification rules
                  </p>
                  <Button variant="secondary" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </GlassCard>

                {/* Database Settings */}
                <GlassCard className="p-6 hover:translate-y-[-2px] transition-transform duration-200 cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
                      <Database className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Database</h3>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    Database configuration, backups, and maintenance settings
                  </p>
                  <Button variant="secondary" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </GlassCard>

                {/* API & Integrations */}
                <GlassCard className="p-6 hover:translate-y-[-2px] transition-transform duration-200 cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
                      <Globe className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">API & Integrations</h3>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    Configure third-party integrations and API settings
                  </p>
                  <Button variant="secondary" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </GlassCard>

                {/* System Configuration */}
                <GlassCard className="p-6 hover:translate-y-[-2px] transition-transform duration-200 cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                      <Settings className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">System Config</h3>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    General system settings, features flags, and configuration
                  </p>
                  <Button variant="secondary" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </GlassCard>

              </div>

              {/* Personal Settings Link */}
              <div className="mt-8">
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Personal Settings</h3>
                      <p className="text-slate-300 text-sm">
                        Manage your personal account settings, preferences, and profile
                      </p>
                    </div>
                    <Button 
                      onClick={() => router.push('/dashboard/member/settings')}
                      className="flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      My Settings
                    </Button>
                  </div>
                </GlassCard>
              </div>

              {/* Information */}
              <div className="mt-6">
                <div className="bg-lime-400/5 rounded-xl p-4 border border-lime-400/20">
                  <p className="text-lime-200 text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Admin settings are currently under development. Most configuration is available through the Prisma DB and Sanity CMS interfaces.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </DashboardContent>
      </div>
    </DashboardShell>
  );
}