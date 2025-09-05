"use client";

import React from "react";
import Link from "next/link";

interface CustomizationOption {
  id: string;
  name: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  badge: string;
  color: 'orange' | 'red' | 'purple' | 'blue' | 'green' | 'lime';
  seeMoreLink: string;
}

const customizationOptions: CustomizationOption[] = [
  {
    id: 'logo-options',
    name: 'Logo Options',
    title: 'Custom Logo Embroidery',
    description: 'Professional embroidery services with 3D puff, flat embroidery, and heat transfer options. Upload your logo and choose from multiple placement positions on your cap.',
    image: '/uploads/home/Customization/Logo OPtions.webp',
    alt: 'Custom Logo Embroidery Options',
    badge: 'Most Popular',
    color: 'orange',
    seeMoreLink: '/customize/baseball-cap?focus=logo'
  },
  {
    id: 'fabric-options',
    name: 'Fabric Options',
    title: 'Premium Fabric Choices',
    description: 'Choose from cotton twill, polyester, performance mesh, wool blends, and eco-friendly materials. Each fabric offers unique benefits for comfort, durability, and style.',
    image: '/uploads/home/Customization/Fabric Options.webp',
    alt: 'Premium Fabric Material Options',
    badge: 'Premium Quality',
    color: 'red',
    seeMoreLink: '/customize/baseball-cap?focus=fabric'
  },
  {
    id: 'closure-options',
    name: 'Closure Options',
    title: 'Adjustable Closure Types',
    description: 'Snapback, fitted, velcro strap, buckle closure, and elastic band options. Choose the perfect fit and style for your custom baseball cap needs.',
    image: '/uploads/home/Customization/Closure Optionns.webp',
    alt: 'Baseball Cap Closure Type Options',
    badge: 'Custom Fit',
    color: 'purple',
    seeMoreLink: '/customize/baseball-cap?focus=closure'
  },
  {
    id: 'accessories-options',
    name: 'Accessories Options',
    title: 'Cap Accessories & Add-ons',
    description: 'Enhance your custom cap with side patches, under-brim designs, sweatbands, chin straps, and decorative elements. Perfect for team uniforms and branded merchandise.',
    image: '/uploads/home/Customization/Accessories Options.webp',
    alt: 'Baseball Cap Accessories and Add-ons',
    badge: 'Unique Style',
    color: 'blue',
    seeMoreLink: '/customize/baseball-cap?focus=accessories'
  }
];

const getBadgeClasses = (color: CustomizationOption['color']) => {
  const colorClasses = {
    orange: {
      bgClass: 'bg-orange-500/15',
      ringClass: 'ring-orange-400/30',
      textClass: 'text-orange-200/90'
    },
    red: {
      bgClass: 'bg-red-500/15',
      ringClass: 'ring-red-400/30',
      textClass: 'text-red-200/90'
    },
    purple: {
      bgClass: 'bg-purple-500/15',
      ringClass: 'ring-purple-400/30',
      textClass: 'text-purple-200/90'
    },
    blue: {
      bgClass: 'bg-blue-500/15',
      ringClass: 'ring-blue-400/30',
      textClass: 'text-blue-200/90'
    },
    green: {
      bgClass: 'bg-green-500/15',
      ringClass: 'ring-green-400/30',
      textClass: 'text-green-200/90'
    },
    lime: {
      bgClass: 'bg-lime-500/15',
      ringClass: 'ring-lime-400/30',
      textClass: 'text-lime-200/90'
    }
  };
  return colorClasses[color];
};

const getBorderColor = (color: CustomizationOption['color']) => {
  const borderColors = {
    orange: 'border-orange-500/30',
    red: 'border-red-500/30',
    purple: 'border-purple-500/30',
    blue: 'border-blue-500/30',
    green: 'border-green-500/30',
    lime: 'border-lime-500/30'
  };
  return borderColors[color];
};

const getLinkColor = (color: CustomizationOption['color']) => {
  const linkColors = {
    orange: 'text-orange-400 hover:text-orange-300',
    red: 'text-red-400 hover:text-red-300',
    purple: 'text-purple-400 hover:text-purple-300',
    blue: 'text-blue-400 hover:text-blue-300',
    green: 'text-green-400 hover:text-green-300',
    lime: 'text-lime-400 hover:text-lime-300'
  };
  return linkColors[color];
};

const CustomizationOptions: React.FC = () => {
  return (
    <div className="mt-16 sm:mt-20">
      <div className="mb-8 sm:mb-12 text-center px-4 sm:px-0">
        <h2 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bricolage font-semibold text-white mb-3 sm:mb-4">
          Customization Options
        </h2>
        <p className="text-base sm:text-lg text-stone-300 max-w-2xl mx-auto font-sans leading-relaxed">
          Transform your blank cap into a masterpiece with our comprehensive customization services. From embroidery to premium materials, create exactly what you envision.
        </p>
      </div>

      {/* Mobile: Horizontal scrolling */}
      <div className="lg:hidden overflow-x-auto scrollbar-hide px-3 xs:px-4">
        <div className="flex space-x-4 xs:space-x-5 sm:space-x-6 pb-2" style={{width: 'max-content'}}>
          {customizationOptions.map((option) => {
            const badge = getBadgeClasses(option.color);
            const borderColor = getBorderColor(option.color);
            const linkColor = getLinkColor(option.color);

            return (
              <article
                key={option.id}
                className={`relative overflow-hidden rounded-xl xs:rounded-2xl sm:rounded-3xl hover:scale-105 transition-all duration-300 min-h-[320px] xs:min-h-[360px] sm:min-h-[420px] flex flex-col glass-morphism-dark glass-hover-dark ${borderColor} shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] flex-shrink-0 w-72 xs:w-80`}
              >
                <div className="relative z-10 p-4 xs:p-5 sm:p-6 flex flex-col h-full justify-between">
                  <div className="mb-4 xs:mb-5 sm:mb-6">
                    <img
                      src={option.image}
                      alt={option.alt}
                      className="w-full aspect-square object-cover rounded-lg xs:rounded-xl mb-3 xs:mb-4"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/uploads/home/Category/6-Panel Perforated Cap.webp'; // Fallback image
                      }}
                    />
                    <span className={`px-2 xs:px-3 py-1 rounded-full text-[10px] xs:text-xs font-medium uppercase tracking-wider ${badge.textClass} ring-1 ${badge.ringClass} ${badge.bgClass} backdrop-blur-sm font-sans`}>
                      {option.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg xs:text-xl sm:text-2xl text-white tracking-tight mb-2 xs:mb-3 font-bricolage font-semibold">
                      {option.title}
                    </h3>

                    <p className="text-xs xs:text-sm leading-relaxed text-stone-300 mb-3 xs:mb-4 font-sans line-clamp-3">
                      {option.description}
                    </p>

                    <Link
                      href={option.seeMoreLink}
                      className={`inline-flex items-center gap-1.5 xs:gap-2 ${linkColor} transition-colors text-xs xs:text-sm font-medium font-sans`}
                    >
                      See More Options
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="xs:w-4 xs:h-4">
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                      </svg>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-6 px-0">
        {customizationOptions.map((option) => {
          const badge = getBadgeClasses(option.color);
          const borderColor = getBorderColor(option.color);
          const linkColor = getLinkColor(option.color);

          return (
            <article
              key={option.id}
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl hover:scale-105 transition-all duration-300 min-h-[380px] sm:min-h-[420px] flex flex-col glass-morphism-dark glass-hover-dark ${borderColor} shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]`}
            >
              <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex flex-col h-full justify-between">
                <div className="mb-6">
                  <img
                    src={option.image}
                    alt={option.alt}
                    className="w-full aspect-square object-cover rounded-xl mb-4"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/uploads/home/Category/6-Panel Perforated Cap.webp'; // Fallback image
                    }}
                  />
                  <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${badge.textClass} ring-1 ${badge.ringClass} ${badge.bgClass} backdrop-blur-sm font-sans`}>
                    {option.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl text-white tracking-tight mb-2 sm:mb-3 font-bricolage font-semibold">
                    {option.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-stone-300 mb-4 font-sans">
                    {option.description}
                  </p>

                  <Link
                    href={option.seeMoreLink}
                    className={`inline-flex items-center gap-2 ${linkColor} transition-colors text-sm font-medium font-sans`}
                  >
                    See More Options
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="text-center mt-8 sm:mt-12 px-4 sm:px-0">
        <Link
          href="/customize/baseball-cap"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-full glass-button glass-hover text-white font-medium font-sans transition-all hover:scale-105 min-h-[44px] text-sm sm:text-base"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="m2 17 10 5 10-5"></path>
            <path d="m2 12 10 5 10-5"></path>
          </svg>
          Start Customizing Your Cap
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-4 sm:h-4">
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default CustomizationOptions;