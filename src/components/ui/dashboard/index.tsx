// Dashboard UI Component Library
// Implements the CustomCap design system from generated-page.html

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { dashboardTheme, getStatusColor, getStatusIcon } from '@/lib/dashboard-theme';

// ============================================================================
// GLASS CARD COMPONENTS
// ============================================================================

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'interactive';
  children: React.ReactNode;
}

export function GlassCard({ 
  variant = 'default', 
  className = '', 
  children, 
  ...props 
}: GlassCardProps) {
  const baseClasses = dashboardTheme.components.card.base;
  const variantClasses = {
    default: dashboardTheme.components.card.shadow,
    hover: `${dashboardTheme.components.card.hover} ${dashboardTheme.components.card.shadowHover}`,
    interactive: `${dashboardTheme.components.card.hover} ${dashboardTheme.components.card.shadowHover} cursor-pointer`
  };
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${dashboardTheme.components.card.ring} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// BUTTON COMPONENTS
// ============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  className = '',
  children,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: dashboardTheme.components.button.primary,
    secondary: dashboardTheme.components.button.secondary,
    ghost: dashboardTheme.components.button.ghost
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      className={`${variants[variant]} ${sizes[size]} inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
      {children}
      {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
    </button>
  );
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusColor = getStatusColor(status);
  const iconName = getStatusIcon(status);
  
  // Icon mapping (you'd import these from lucide-react in actual usage)
  const getIconComponent = (iconName: string) => {
    // This is a placeholder - you'd import actual icons from lucide-react
    return <span className="w-3.5 h-3.5 inline-block rounded-full bg-current opacity-70" />;
  };
  
  const statusClasses = {
    success: dashboardTheme.components.badge.success,
    warning: dashboardTheme.components.badge.warning,
    error: dashboardTheme.components.badge.error,
    info: dashboardTheme.components.badge.info,
    pending: dashboardTheme.components.badge.pending
  };
  
  return (
    <span 
      className={`${dashboardTheme.components.badge.base} ${statusClasses[statusColor]} ${className}`}
    >
      {getIconComponent(iconName)}
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  onClick?: () => void;
  active?: boolean;
}

export function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  onClick, 
  active = false 
}: StatCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={`
        group relative flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 
        ${active ? 'ring-2 ring-lime-400/60' : ''}
        ${onClick ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black' : ''}
      `}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 ring-1 ring-white/5 transition group-hover:opacity-100" />
      
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-lime-400" />
          <span className="text-sm text-slate-300/80">{label}</span>
        </div>
        {trend && (
          <span className={`text-xs font-medium ${
            trend.direction === 'up' ? 'text-lime-300' : 
            trend.direction === 'down' ? 'text-red-300' : 
            'text-slate-400'
          }`}>
            {trend.direction === 'up' && '↗'} 
            {trend.direction === 'down' && '↘'} 
            {trend.value}
          </span>
        )}
      </div>
      
      <div className="text-3xl font-extrabold tracking-tight text-white">
        {value}
      </div>
    </Component>
  );
}

// ============================================================================
// NAVIGATION COMPONENTS
// ============================================================================

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: string | number;
  onClick?: () => void;
  href?: string;
}

export function NavItem({ 
  icon: Icon, 
  label, 
  active = false, 
  badge, 
  onClick,
  href 
}: NavItemProps) {
  const classes = active 
    ? dashboardTheme.components.nav.itemActive
    : dashboardTheme.components.nav.item;
  
  const Component = href ? 'a' : 'button';
  const componentProps = href ? { href } : { onClick };
  
  return (
    <Component
      className={classes}
      {...componentProps}
    >
      <Icon className={`${dashboardTheme.components.nav.icon} ${active ? 'text-lime-400' : 'text-slate-300'}`} />
      <span className={`${dashboardTheme.components.nav.text} ${active ? 'text-slate-100' : 'text-slate-300'}`}>
        {label}
      </span>
      {badge && (
        <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-lime-400/20 text-lime-200 border border-lime-400/30">
          {badge}
        </span>
      )}
    </Component>
  );
}

// ============================================================================
// SEARCH INPUT COMPONENT
// ============================================================================

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
}

export function SearchInput({ 
  icon: Icon,
  className = '',
  ...props 
}: SearchInputProps) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
      )}
      <input
        type="text"
        className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-300/40 placeholder:text-slate-500 text-sm text-white ${className}`}
        {...props}
      />
    </div>
  );
}

// ============================================================================
// TABLE COMPONENTS
// ============================================================================

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="text-slate-300">
      <tr className="border-b border-white/10">
        {children}
      </tr>
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-white/10">
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '' }: TableProps) {
  return (
    <tr className={`hover:bg-white/5 ${className}`}>
      {children}
    </tr>
  );
}

export function TableCell({ 
  children, 
  className = '',
  align = 'left' 
}: { 
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center', 
    right: 'text-right'
  };
  
  return (
    <td className={`py-3 px-4 ${alignClass[align]} ${className}`}>
      {children}
    </td>
  );
}

export function TableHeaderCell({ 
  children, 
  sortable = false,
  onClick,
  className = '',
  align = 'left'
}: { 
  children: React.ReactNode;
  sortable?: boolean;
  onClick?: () => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center', 
    right: 'text-right'
  };
  
  return (
    <th
      className={`py-3 px-4 ${alignClass[align]} ${className}`}
    >
      {sortable ? (
        <button
          className="hover:underline inline-flex items-center gap-1 w-full text-left"
          onClick={onClick}
        >
          {children}
          <span className="w-4 h-4">↕</span>
        </button>
      ) : (
        <>
          {children}
        </>
      )}
    </th>
  );
}

// ============================================================================
// MODAL COMPONENTS  
// ============================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md' 
}: ModalProps) {
  if (!isOpen) return null;
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  return (
    <div className="fixed inset-0 items-center justify-center flex z-50">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div className={`relative mx-4 sm:mx-auto w-full ${sizes[size]} bg-black/70 border border-white/10 rounded-2xl p-5`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold tracking-tight">{title}</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// BACKGROUND COMPONENTS
// ============================================================================

export function DashboardBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen text-slate-200 bg-black selection:bg-lime-400/30 selection:text-lime-100">
      {/* Background: gradient + grain + accent glows */}
      <div className="fixed inset-0 -z-10">
        <div 
          className="absolute inset-0"
          style={{ 
            background: `${dashboardTheme.colors.background.radial}, ${dashboardTheme.colors.background.linear}` 
          }}
        />
        
        {/* Subtle grain texture overlay via SVG pattern */}
        <div 
          className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><defs><radialGradient id="g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="%23ffffff" stop-opacity="0.06"/><stop offset="1" stop-color="%23000000" stop-opacity="0"/></radialGradient></defs><rect width="36" height="36" fill="url(%23g)"/></svg>')`,
            backgroundSize: '120px 120px'
          }}
        />
        
        {/* Accent glows */}
        <div className={dashboardTheme.glows.lime.position} />
        <div className={dashboardTheme.glows.orange.position} />
        <div className={dashboardTheme.glows.purple.positionAlt} />
      </div>
      
      {children}
    </div>
  );
}

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardBackground>
      <div className="relative mx-auto max-w-[1800px]">
        {children}
      </div>
    </DashboardBackground>
  );
}

export function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 w-full">
      {children}
    </div>
  );
}