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
  searchResults?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    type: 'user' | 'order' | 'product' | 'quote';
    url?: string;
  }>;
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
  searchResults = [],
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
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications] = useState(3); // Mock notification count
  
  // Map roles from AuthContext user shape
  const accessRole = user?.accessRole; // 'CUSTOMER' | 'STAFF' | 'SUPER_ADMIN' | 'MASTER_ADMIN'
  const customerRole = user?.customerRole; // 'RETAIL' | 'WHOLESALE' | 'SUPPLIER'
  const isMasterAdmin = accessRole === 'MASTER_ADMIN';
  const isAdmin = isMasterAdmin || accessRole === 'SUPER_ADMIN' || accessRole === 'STAFF';
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowSearchResults(query.length > 0);
    onSearch?.(query);
  };

  const handleSearchFocus = () => {
    if (searchQuery.length > 0) {
      setShowSearchResults(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding results to allow for clicks
    setTimeout(() => setShowSearchResults(false), 200);
  };

  const getSearchResultIcon = (type: string) => {
    switch (type) {
      case 'user': return '👤';
      case 'order': return '📦';
      case 'product': return '🧢';
      case 'quote': return '📋';
      default: return '🔍';
    }
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
    <header className={`${sticky ? 'sticky top-0 z-20 ' : 'relative'}`}>
      <div className="px-6 md:px-10 pt-6 pb-6">
        <GlassCard className="p-0">
          {/* Top Row - Search and Actions */}
          <div className="flex items-center gap-2 md:gap-3 p-3 border-b border-stone-600">
            {/* Mobile Menu Button */}
            <button 
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2.5 rounded-xl glass-morphism-subtle border border-stone-600 hover:glass-morphism transition-all duration-200 hover:-translate-y-0.5 group"
              title="Menu"
            >
              <PanelLeftOpen className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            </button>
            
            {/* Search */}
            {showSearch && (
              <div className="flex-1 relative">
                <SearchInput
                  icon={Search}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={handleSearch}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                />
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50">
                    <div className="glass-morphism-strong rounded-xl border border-stone-600 p-2 max-h-80 overflow-y-auto">
                      {searchResults.slice(0, 8).map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center gap-3 p-3 rounded-lg glass-hover cursor-pointer transition-all duration-200"
                          onClick={() => {
                            if (result.url) {
                              window.location.href = result.url;
                            }
                            setShowSearchResults(false);
                          }}
                        >
                          <span className="text-lg">{getSearchResultIcon(result.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium truncate">
                              {result.title}
                            </div>
                            {result.subtitle && (
                              <div className="text-slate-400 text-xs truncate">
                                {result.subtitle}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 capitalize">
                            {result.type}
                          </span>
                        </div>
                      ))}
                      {searchResults.length > 8 && (
                        <div className="text-center py-2 text-xs text-slate-400">
                          +{searchResults.length - 8} more results
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* No results message */}
                {showSearchResults && searchQuery.length > 0 && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50">
                    <div className="glass-morphism-strong rounded-xl border border-stone-600 p-4 text-center">
                      <div className="text-slate-400 text-sm">
                        No results found for "{searchQuery}"
                      </div>
                      <div className="text-slate-500 text-xs mt-1">
                        Try searching for orders, users, or products
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Spacer when search is hidden */}
            {!showSearch && <div className="flex-1" />}

            {/* Actions */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              {/* Notifications */}
              {showNotifications && (
                <div className="relative">
                  <button 
                    className="p-2.5 rounded-xl glass-morphism-subtle border border-stone-600 hover:glass-morphism transition-all duration-200 hover:-translate-y-0.5 relative group" 
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
                    {notifications > 0 && (
                      <>
                        <span className="absolute -top-1 -right-1 inline-flex">
                          <span className="absolute inline-flex h-3 w-3 rounded-full bg-lime-400 animate-ping opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-lime-400 items-center justify-center">
                            <span className="text-[10px] font-bold text-black">
                              {notifications > 9 ? '9+' : notifications}
                            </span>
                          </span>
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {/* Status Chip */}
              {showStatus && (
                <div className="hidden sm:flex px-3 py-2 rounded-full glass-morphism-subtle border border-stone-600 hover:glass-morphism transition-all duration-200 group">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></div>
                    <span className="text-slate-300 group-hover:text-white transition-colors text-sm font-medium whitespace-nowrap">
                      Active since {formatTime()}
                    </span>
                  </div>
                </div>
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
                  <button className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-full glass-morphism-subtle border border-stone-600 hover:glass-morphism transition-all duration-200 hover:-translate-y-0.5 group">
                    {user?.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        className="w-6 h-6 rounded-full object-cover ring-2 ring-lime-400/20 group-hover:ring-lime-400/40 transition-all" 
                        alt="Profile" 
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full glass-morphism flex items-center justify-center ring-2 ring-lime-400/20 group-hover:ring-lime-400/40 transition-all">
                        <User className="w-3 h-3 text-slate-300 group-hover:text-white transition-colors" />
                      </div>
                    )}
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors font-medium">
                      {user?.name?.split(' ')[0] || 'User'}
                    </span>
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
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-stone-700 border border-stone-600 text-sm">
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