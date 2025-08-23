'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Bell, Shield, Crown, PanelLeftOpen, User } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { GlassCard, SearchInput, Button } from './index';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onMobileMenuToggle?: () => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  actions?: React.ReactNode;
  titleActions?: React.ReactNode;
  showProfile?: boolean;
  showNotifications?: boolean;
  showStatus?: boolean;
  showNewQuote?: boolean;
  primaryActionText?: string;
  onPrimaryAction?: () => void;
  sticky?: boolean;
}

export function DashboardHeader({
  title,
  subtitle,
  onMobileMenuToggle,
  showSearch = true,
  searchPlaceholder = "Search orders, users, products...",
  onSearch,
  actions,
  titleActions,
  showProfile = true,
  showNotifications = true,
  showStatus = true,
  showNewQuote = true,
  primaryActionText = "New Quote",
  onPrimaryAction,
  sticky = true
}: DashboardHeaderProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications] = useState(3); // Mock notification count
  
  // Map roles from AuthContext user shape
  const accessRole = user?.accessRole; // 'CUSTOMER' | 'STAFF' | 'SUPER_ADMIN' | 'MASTER_ADMIN'
  const customerRole = user?.customerRole; // 'RETAIL' | 'WHOLESALE' | 'SUPPLIER'
  const isMasterAdmin = accessRole === 'MASTER_ADMIN';
  const isAdmin = isMasterAdmin || accessRole === 'SUPER_ADMIN' || accessRole === 'STAFF';
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const formatTime = () => {
    return new Date().toLocaleString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <header className={`${sticky ? 'sticky top-0 z-20 backdrop-blur-xl' : 'relative'}`}>
      <div className="px-6 md:px-10 pt-6 pb-6">
        <GlassCard className="p-0">
          {/* Top Row - Search and Actions */}
          <div className="flex items-center gap-3 p-3 border-b border-white/10">
            {/* Mobile Menu Button */}
            <button 
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
              title="Menu"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
            
            {/* Search */}
            {showSearch && (
              <div className="flex-1">
                <SearchInput
                  icon={Search}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
            )}

            {/* Spacer when search is hidden */}
            {!showSearch && <div className="flex-1" />}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              {showNotifications && (
                <div className="relative">
                  <button className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 relative" title="Notifications">
                    <Bell className="w-5 h-5" />
                    {notifications > 0 && (
                      <>
                        <span className="absolute -top-0.5 -right-0.5 inline-flex">
                          <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping opacity-60" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {/* Status Chip */}
              {showStatus && (
                <button className="px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-sm">
                  <span className="text-slate-300">Active since {formatTime()}</span>
                </button>
              )}
              
              {/* Primary Action */}
              {showNewQuote && (
                <Button variant="primary" onClick={onPrimaryAction}>
                  {primaryActionText}
                </Button>
              )}
              
              {/* User Profile (Desktop) */}
              {showProfile && (
                <Link href="/profile">
                  <button className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200">
                    {user?.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        className="w-6 h-6 rounded-full object-cover" 
                        alt="Profile" 
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="text-sm">{user?.name?.split(' ')[0] || 'User'}</span>
                  </button>
                </Link>
              )}
              
              {/* Custom Actions */}
              {actions}
            </div>
          </div>
          
          {/* Bottom Row - Title and Role Badge */}
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl md:text-5xl xl:text-6xl tracking-tight font-extrabold text-white">
                  {title}
                </h1>
                
                {/* Role Badge */}
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm">
                  {isMasterAdmin ? (
                    <>
                      <Crown className="w-4.5 h-4.5 text-lime-400" />
                      Master Admin
                    </>
                  ) : isAdmin ? (
                    <>
                      <Shield className="w-4.5 h-4.5 text-lime-400" />
                      Admin
                    </>
                  ) : customerRole === 'WHOLESALE' ? (
                    <>
                      <Shield className="w-4.5 h-4.5 text-orange-400" />
                      Wholesale
                    </>
                  ) : customerRole === 'SUPPLIER' ? (
                    <>
                      <Shield className="w-4.5 h-4.5 text-purple-400" />
                      Supplier
                    </>
                  ) : (
                    <>
                      <Shield className="w-4.5 h-4.5 text-cyan-400" />
                      Member
                    </>
                  )}
                </span>
              </div>
              
              {/* Title Actions */}
              {titleActions && (
                <div className="flex items-center gap-2">
                  {titleActions}
                </div>
              )}
            </div>
            
            {subtitle && (
              <p className="mt-2 text-sm md:text-base text-slate-300">
                {subtitle}
              </p>
            )}
          </div>
        </GlassCard>
      </div>
    </header>
  );
}

export default DashboardHeader;