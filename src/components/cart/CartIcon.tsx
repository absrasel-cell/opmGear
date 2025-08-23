'use client';

import Link from 'next/link';
import { useCart } from './CartContext';

interface CartIconProps {
  className?: string;
  showBadge?: boolean;
  badgeClassName?: string;
  renderAsLink?: boolean;
}

export default function CartIcon({ 
  className = '', 
  showBadge = true, 
  badgeClassName = '',
  renderAsLink = true
}: CartIconProps) {
  const { getItemCount, isLoading } = useCart();
  const itemCount = getItemCount();

  const iconContent = (
    <>
      {/* Modern Cart Icon - Theme Matched */}
      <div className="relative">
        {/* Main Cart Icon */}
        <div className="relative w-6 h-6">
          {/* Custom Shopping Bag - Theme Matched */}
          <svg 
            className="w-6 h-6 text-slate-300 group-hover:text-lime-300 transition-colors duration-200" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth={1.5}
          >
            {/* Bag Body with rounded corners */}
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
            />
            {/* Bag Handle */}
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M8 11V7a4 4 0 118 0v4" 
            />
            {/* Subtle inner detail */}
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M7 13h10" 
              opacity="0.3"
            />
          </svg>
          
          {/* Theme-matched glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-lime-400/10 to-transparent rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        </div>

        {/* Item Count Badge - Theme Matched */}
        {showBadge && itemCount > 0 && (
          <div className={`
            absolute -top-1 -right-1 
            ${isLoading ? 'animate-pulse' : ''}
            ${badgeClassName || 'bg-gradient-to-r from-lime-400 to-orange-400 text-black'}
            text-xs font-bold rounded-full h-5 w-5 
            flex items-center justify-center 
            min-w-[20px] text-center
            shadow-[0_4px_12px_rgba(132,204,22,0.4)] border border-lime-300/30
            transition-all duration-300 transform group-hover:scale-110
            ${itemCount > 9 ? 'px-1' : ''}
          `}>
            {itemCount > 99 ? '99+' : itemCount}
          </div>
        )}

        {/* Loading Indicator - Theme Matched */}
        {isLoading && (
          <div className="absolute -top-1 -right-1">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-lime-400 border-t-transparent"></div>
          </div>
        )}

        {/* Hover Effect Ring - Theme Matched */}
        <div className="absolute inset-0 rounded-xl ring-2 ring-lime-400/0 group-hover:ring-lime-400/20 transition-all duration-200 scale-0 group-hover:scale-100"></div>
      </div>
    </>
  );

  if (renderAsLink) {
    return (
      <Link 
        href="/cart" 
        className={`relative group p-2 rounded-xl hover:bg-white/5 transition-all duration-200 ${className}`}
        aria-label={`Shopping cart with ${itemCount} items`}
      >
        {iconContent}
      </Link>
    );
  }

  return (
    <div 
      className={`relative group p-2 rounded-xl ${className}`}
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      {iconContent}
    </div>
  );
}
