"use client";

import React, { useState, useEffect } from 'react';

/**
 * HeroImageGallery Component
 * 
 * A sophisticated sliding image gallery with smooth animations for hero sections.
 * 
 * Features:
 * - Auto-advance every 10 seconds with smooth transitions
 * - Glass morphism design with backdrop blur effects
 * - Keyboard navigation (arrow keys)
 * - Touch/swipe support for mobile devices
 * - Pause on hover functionality
 * - Clickable indicators with hover effects
 * - Progress bar showing current position
 * - Image preloading for optimal performance
 * - Loading states and transition animations
 * - Navigation arrows (visible on hover)
 * - Pause indicator when hovering
 * - Responsive design optimized for all screen sizes
 */

interface HeroImageGalleryProps {
  className?: string;
}

const HeroImageGallery: React.FC<HeroImageGalleryProps> = ({ className = "" }) => {
  // Array of hero images from the heroImages directory
  const heroImages = [
    '/uploads/home/heroImages/1hero.webp',
    '/uploads/home/heroImages/hero3.webp',
    '/uploads/home/heroImages/hero4.webp',
    '/uploads/home/heroImages/hero5.webp'
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>(new Array(heroImages.length).fill(false));
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Preload images for smooth transitions
  useEffect(() => {
    heroImages.forEach((src, index) => {
      const img = new Image();
      img.onload = () => {
        setImagesLoaded(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      };
      img.src = src;
    });
  }, [heroImages]);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) => 
          prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
        );
        setIsTransitioning(false);
      }, 800); // Slower transition timing
    }, 10000); // Change every 10 seconds

    return () => clearInterval(interval);
  }, [heroImages.length, isPaused]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentImageIndex((prevIndex) => 
            prevIndex === 0 ? heroImages.length - 1 : prevIndex - 1
          );
          setIsTransitioning(false);
        }, 150);
      } else if (event.key === 'ArrowRight') {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentImageIndex((prevIndex) => 
            prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
          );
          setIsTransitioning(false);
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [heroImages.length]);

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swipe left - next image
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) => 
          prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
        );
        setIsTransitioning(false);
      }, 150);
    } else if (distance < -minSwipeDistance) {
      // Swipe right - previous image
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) => 
          prevIndex === 0 ? heroImages.length - 1 : prevIndex - 1
        );
        setIsTransitioning(false);
      }, 150);
    }
  };

  return (
    <div 
      className={`relative overflow-hidden ${className} group`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Image Container */}
      <div className="relative w-full h-full">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out transform ${
              index === currentImageIndex
                ? 'opacity-100 scale-100 translate-x-0'
                : index === (currentImageIndex - 1 + heroImages.length) % heroImages.length
                ? 'opacity-0 scale-105 -translate-x-full'
                : 'opacity-0 scale-95 translate-x-full'
            } ${isTransitioning ? 'transition-all duration-1000' : ''}`}
          >
            <img
              src={image}
              alt={`Hero image ${index + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                imagesLoaded[index] ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                filter: 'brightness(0.85) contrast(1.1)', // Slight enhancement for better overlay visibility
                transform: index === currentImageIndex ? 'scale(1.02)' : 'scale(1)', // Subtle zoom effect
                transition: 'transform 10s ease-in-out, opacity 1s ease-in-out'
              }}
            />
            {/* Loading placeholder */}
            {!imagesLoaded[index] && (
              <div className="absolute inset-0 bg-stone-800/90 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/70"></div>
              </div>
            )}
          </div>
        ))}
        
        {/* Gradient Overlay - maintaining original styling */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* Loading overlay during transition */}
        <div 
          className={`absolute inset-0 bg-black/5 backdrop-blur-[1px] transition-all duration-800 ease-in-out ${
            isTransitioning ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Pause indicator */}
        <div className={`absolute top-4 right-4 transition-all duration-300 ${
          isPaused ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}>
          <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
            <span className="text-white/80 text-sm font-medium">Paused</span>
          </div>
        </div>
      </div>

      {/* Image Indicators - Glass morphism style */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/20">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrentImageIndex(index);
                  setIsTransitioning(false);
                }, 150);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 hover:scale-125 ${
                index === currentImageIndex
                  ? 'bg-white shadow-lg shadow-white/30'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Progress bar - subtle progress indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
        <div 
          className={`h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300 ease-out ${
            isPaused ? 'opacity-50' : 'opacity-100'
          }`}
          style={{
            width: `${((currentImageIndex + 1) / heroImages.length) * 100}%`,
          }}
        />
      </div>

      {/* Navigation Arrows - Optional, hidden by default for clean look */}
      <div className="absolute inset-y-0 left-4 right-4 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => {
            setIsTransitioning(true);
            setTimeout(() => {
              setCurrentImageIndex((prevIndex) => 
                prevIndex === 0 ? heroImages.length - 1 : prevIndex - 1
              );
              setIsTransitioning(false);
            }, 150);
          }}
          className="pointer-events-auto opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all duration-300 w-12 h-12 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transform"
          aria-label="Previous image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        
        <button
          onClick={() => {
            setIsTransitioning(true);
            setTimeout(() => {
              setCurrentImageIndex((prevIndex) => 
                prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
              );
              setIsTransitioning(false);
            }, 150);
          }}
          className="pointer-events-auto opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all duration-300 w-12 h-12 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transform"
          aria-label="Next image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default HeroImageGallery;