'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PackageSearch,
  Users,
  FileText,
  Boxes,
  LayoutTemplate,
  Settings,
  FlaskConical,
  FileBarChart,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Crown,
  Shield,
  ChevronDown,
  User,
  MessageCircle,
  Database,
  Edit3,
  CreditCard,
  Truck,
  BarChart3,
  Store,
  Mail
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { GlassCard, NavItem } from './index';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function Sidebar({ 
  collapsed = false, 
  onToggleCollapse,
  className = '' 
}: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Role mapping from AuthContext user shape
  const accessRole = user?.accessRole; // 'CUSTOMER' | 'STAFF' | 'SUPER_ADMIN' | 'MASTER_ADMIN'
  const customerRole = user?.customerRole; // 'RETAIL' | 'WHOLESALE' | 'SUPPLIER'

  const isMasterAdmin = accessRole === 'MASTER_ADMIN';
  const isAdmin = isMasterAdmin || accessRole === 'SUPER_ADMIN' || accessRole === 'STAFF';
  
  const mainNavItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: isAdmin ? '/dashboard/admin' : '/dashboard/member',
      active: pathname?.includes('/dashboard')
    },
    ...(isAdmin ? [
      {
        icon: MessageCircle,
        label: 'Messages',
        href: '/dashboard/admin/messages',
        active: pathname?.includes('/messages') && !pathname?.includes('/form-submissions')
      },
      {
        icon: Mail,
        label: 'Form Submissions',
        href: '/dashboard/admin/form-submissions',
        active: pathname?.includes('/form-submissions')
      },
      {
        icon: Boxes,
        label: 'Products',
        href: '/dashboard/admin/products',
        active: pathname?.includes('/products') && !pathname?.includes('/marketplace')
      },
      {
        icon: Store,
        label: 'Market Place',
        href: '/dashboard/admin/marketplace',
        active: pathname?.includes('/marketplace')
      },
      {
        icon: Truck,
        label: 'Orders & Shipment',
        href: '/dashboard/admin/orders',
        active: pathname?.includes('/orders') || pathname?.includes('/shipments')
      },
      {
        icon: CreditCard,
        label: 'Billing & Accounts',
        href: '/dashboard/admin/billing',
        active: pathname?.includes('/billing')
      },
      {
        icon: LayoutTemplate,
        label: 'Pages',
        href: '/dashboard/admin/pages',
        active: pathname?.includes('/pages')
      }
    ] : []),
    {
      icon: Settings,
      label: 'Settings',
      href: isAdmin ? '/dashboard/admin/settings' : '/dashboard/member/settings',
      active: pathname?.includes('/settings')
    }
  ];

  const advancedNavItems = isAdmin ? [
    {
      icon: Database,
      label: 'Prisma DB',
      href: '/dashboard/admin/prisma',
      active: pathname?.includes('/prisma')
    },
    {
      icon: Edit3,
      label: 'Sanity CMS',
      href: '/dashboard/admin/sanity',
      active: pathname?.includes('/sanity')
    },
    {
      icon: FlaskConical,
      label: 'Feature Flags',
      href: '/dashboard/admin/feature-flags',
      active: pathname?.includes('/feature-flags')
    },
    {
      icon: FileBarChart,
      label: 'System Logs',
      href: '/dashboard/admin/logs',
      active: pathname?.includes('/logs')
    }
  ] : [];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col ${collapsed ? 'w-20' : 'w-80'} shrink-0 h-[100dvh] sticky top-0 pt-6 px-4 pb-4 gap-4 text-slate-200 transition-all duration-300 ${className}`}
      >
        <div className="flex-1 overflow-hidden">
          <div className="glass-morphism rounded-2xl p-4">

            {/* User Profile */}
            <Link href={isAdmin ? "/dashboard/admin/profile" : "/dashboard/member/profile"}>
              <div className={`mt-5 flex items-center gap-3 p-3 rounded-xl bg-black/60 border border-white/10 backdrop-blur-lg hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${collapsed ? 'justify-center' : ''}`}>
                {user?.avatarUrl ? (
                  <img 
                    src={user.avatarUrl}
                    alt="User Avatar" 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-stone-500 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="text-slate-100 font-medium truncate">
                      {user?.name || 'User'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300/80">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full glass-badge">
                        {isMasterAdmin ? (
                          <Crown className="w-3.5 h-3.5 text-lime-400" />
                        ) : isAdmin ? (
                          <Shield className="w-3.5 h-3.5 text-lime-400" />
                        ) : customerRole === 'WHOLESALE' ? (
                          <Shield className="w-3.5 h-3.5 text-orange-400" />
                        ) : customerRole === 'SUPPLIER' ? (
                          <Shield className="w-3.5 h-3.5 text-purple-400" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {isMasterAdmin
                          ? 'Master Admin'
                          : isAdmin
                          ? 'Admin'
                          : customerRole === 'WHOLESALE'
                          ? 'Wholesale'
                          : customerRole === 'SUPPLIER'
                          ? 'Supplier'
                          : 'Member'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Link>

            {/* Navigation */}
            <nav className="mt-6 flex flex-col gap-3">
              {mainNavItems.map((item, index) => (
                <Link 
                  key={index}
                  href={item.href}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl bg-black/60 border border-white/10 backdrop-blur-lg hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 ${
                    item.active ? 'ring-2 ring-lime-400/60' : ''
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <item.icon className={`w-5 h-5 ${item.active ? 'text-lime-400' : 'text-slate-300'}`} />
                  {!collapsed && (
                    <span className={`text-sm font-medium ${item.active ? 'text-slate-100' : 'text-slate-300'}`}>
                      {item.label}
                    </span>
                  )}
                </Link>
              ))}

              {/* Advanced Section for Admins */}
              {advancedNavItems.length > 0 && !collapsed && (
                <div className="mt-6 pt-4 border-t border-stone-600">
                  <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-slate-400">
                    Advanced
                  </div>
                  <div className="flex flex-col gap-3">
                    {advancedNavItems.map((item, index) => (
                      <Link 
                        key={index}
                        href={item.href}
                        className={`group flex items-center gap-3 px-4 py-3 rounded-xl bg-black/60 border border-white/10 backdrop-blur-lg hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 ${
                          item.active ? 'ring-2 ring-lime-400/60' : ''
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${item.active ? 'text-lime-400' : 'text-lime-300'}`} />
                        <span className={`text-sm font-medium ${item.active ? 'text-slate-100' : 'text-slate-300'}`}>
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </nav>
          </div>
        </div>

        {/* Logout */}
        <button 
          onClick={() => logout()}
          className={`mt-2 flex items-center ${collapsed ? 'justify-center' : 'justify-center'} gap-2 w-full py-2 rounded-full bg-black/60 border border-white/10 backdrop-blur-lg hover:scale-[1.02] text-slate-200 hover:-translate-y-0.5 transition-all duration-200`}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Log out</span>}
        </button>

        {/* Collapsed state expand button */}
        {collapsed && (
          <button 
            onClick={onToggleCollapse}
            className="p-2 rounded-xl bg-black/60 border border-white/10 backdrop-blur-lg hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 will-change-transform"
            title="Expand"
          >
            <PanelLeftOpen className="w-5 h-5 text-slate-300" />
          </button>
        )}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/60 "
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-black/60 border-r border-stone-600 p-4">
            <nav className="grid gap-3">
              {mainNavItems.map((item, index) => (
                <Link 
                  key={index}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/60 border border-white/10 backdrop-blur-lg hover:scale-[1.02] text-slate-300 hover:text-white transition-all duration-200"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Menu Button */}
      <button 
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-xl bg-black/60 border border-white/10 backdrop-blur-lg hover:scale-[1.02] transition-all duration-200"
        title="Menu"
      >
        <PanelLeftOpen className="w-5 h-5" />
      </button>
    </>
  );
}

export default Sidebar;