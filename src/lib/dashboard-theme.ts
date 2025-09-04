// Dashboard Design System Configuration
// Based on the generated design language from generated-page.html

export const dashboardTheme = {
  // Color System
  colors: {
    // Primary Brand Colors
    primary: {
      lime: {
        50: 'rgba(247, 254, 231, 1)', // #f7fee7
        100: 'rgba(236, 252, 203, 1)', // #ecfccb
        200: 'rgba(217, 249, 157, 1)', // #d9f99d
        300: 'rgba(190, 242, 100, 1)', // #bef264
        400: 'rgba(132, 204, 22, 1)',  // #84cc16 - Primary
        500: 'rgba(101, 163, 13, 1)',  // #65a30d
        600: 'rgba(77, 124, 15, 1)',   // #4d7c0f
      }
    },
    
    // Accent Colors
    accent: {
      orange: {
        400: 'rgba(251, 146, 60, 1)',  // #fb923c
        300: 'rgba(253, 186, 116, 1)', // #fdba74
      },
      purple: {
        400: 'rgba(196, 181, 253, 1)', // #c4b5fd
        500: 'rgba(139, 92, 246, 1)',  // #8b5cf6
      },
      cyan: {
        300: 'rgba(103, 232, 249, 1)', // #67e8f9
        400: 'rgba(34, 211, 238, 1)',  // #22d3ee
      }
    },
    
    // Background System
    background: {
      primary: 'rgba(0, 0, 0, 1)',           // #000000
      secondary: 'rgba(5, 7, 14, 1)',        // #05070e
      gradient: {
        from: 'rgba(0, 0, 0, 1)',
        via: 'rgba(5, 7, 14, 1)', 
        to: 'rgba(0, 0, 0, 1)'
      },
      radial: 'radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,0.06), rgba(255,255,255,0.02) 30%, transparent 60%)',
      linear: 'linear-gradient(180deg, #000 0%, #05070e 50%, #000 100%)'
    },
    
    // Solid System (replaces glass)
    solid: {
      primary: 'rgba(68, 64, 60, 1)',    // bg-stone-700
      secondary: 'rgba(87, 83, 78, 1)',  // bg-stone-600
      border: 'rgba(120, 113, 108, 1)',     // border-stone-500
      borderHover: 'rgba(168, 162, 158, 1)', // border-stone-400
      ring: 'rgba(68, 64, 60, 1)',       // ring-stone-700
    },
    
    // Text System
    text: {
      primary: 'rgba(255, 255, 255, 1)',       // text-white
      secondary: 'rgba(226, 232, 240, 1)',     // text-slate-200
      tertiary: 'rgba(203, 213, 225, 1)',      // text-slate-300
      muted: 'rgba(148, 163, 184, 0.8)',       // text-slate-400/80
      placeholder: 'rgba(255, 255, 255, 0.4)', // placeholder-white/40
    },
    
    // Status Colors
    status: {
      success: {
        background: 'rgba(132, 204, 22, 0.1)',   // bg-lime-400/10
        border: 'rgba(132, 204, 22, 0.2)',       // border-lime-400/20
        text: 'rgba(190, 242, 100, 1)',          // text-lime-300
      },
      warning: {
        background: 'rgba(251, 146, 60, 0.1)',   // bg-orange-400/10
        border: 'rgba(251, 146, 60, 0.2)',       // border-orange-400/20
        text: 'rgba(253, 186, 116, 1)',          // text-orange-300
      },
      error: {
        background: 'rgba(239, 68, 68, 0.1)',    // bg-red-500/10
        border: 'rgba(239, 68, 68, 0.2)',        // border-red-500/20
        text: 'rgba(248, 113, 113, 1)',          // text-red-400
      },
      info: {
        background: 'rgba(34, 211, 238, 0.1)',   // bg-cyan-400/10
        border: 'rgba(34, 211, 238, 0.2)',       // border-cyan-400/20
        text: 'rgba(103, 232, 249, 1)',          // text-cyan-300
      },
      pending: {
        background: 'rgba(148, 163, 184, 0.1)',  // bg-slate-400/10
        border: 'rgba(148, 163, 184, 0.2)',      // border-slate-400/20
        text: 'rgba(203, 213, 225, 1)',          // text-slate-300
      }
    }
  },

  // Typography System
  typography: {
    fontFamily: {
      primary: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial'
    },
    fontSize: {
      hero: ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1', letterSpacing: '-0.02em' }], // text-4xl md:text-5xl xl:text-6xl
      title: ['clamp(1.875rem, 3vw, 2.25rem)', { lineHeight: '1.2', letterSpacing: '-0.025em' }], // text-3xl md:text-4xl
      heading: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.025em' }], // text-2xl
      subheading: ['1.125rem', { lineHeight: '1.375', fontWeight: '600' }], // text-lg
      body: ['0.875rem', { lineHeight: '1.5' }], // text-sm
      caption: ['0.75rem', { lineHeight: '1.5', opacity: '0.8' }] // text-xs
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    }
  },

  // Spacing & Layout
  spacing: {
    section: '2rem', // 32px
    card: '1.5rem',  // 24px
    element: '1rem', // 16px
    tight: '0.5rem', // 8px
  },

  // Border Radius System
  borderRadius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px - Primary for cards
    '3xl': '2rem',    // 32px
    full: '9999px'
  },

  // Shadow System
  shadows: {
    glass: '0 10px 40px -10px rgba(0, 0, 0, 0.6)',
    glassHover: '0 20px 50px rgba(132, 204, 22, 0.10)',
    button: '0 0 30px rgba(132, 204, 22, 0.25)',
    buttonHover: '0 10px 30px -10px rgba(132, 204, 22, 0.65)',
  },

  // Animation System
  animations: {
    // Micro-interactions
    hover: {
      translateY: '-0.125rem', // -translate-y-0.5
      duration: '200ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    glow: {
      duration: '300ms',
      easing: 'ease-out'
    },
    fadeInUp: {
      from: { opacity: 0, transform: 'translateY(30px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
      duration: '800ms',
      easing: 'ease-out'
    }
  },

  // Component Variants
  components: {
    // Glass Card System
    card: {
      base: 'rounded-2xl glass-morphism',
      hover: 'glass-hover hover:-translate-y-0.5 transition-all duration-300',
      shadow: 'shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]',
      shadowHover: 'hover:shadow-[0_20px_50px_rgba(132,204,22,0.10)]',
      ring: 'ring-1 ring-white/10'
    },
    
    // Button System
    button: {
      primary: 'px-4 py-2 rounded-full glass-button-primary text-white font-medium shadow-[0_0_30px_rgba(132,204,22,0.25)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(132,204,22,0.65)] transition',
      secondary: 'px-4 py-2 rounded-full glass-button glass-hover text-white transition',
      ghost: 'px-3 py-2 rounded-xl glass-hover transition'
    },
    
    // Navigation
    nav: {
      item: 'group flex items-center gap-3 px-3 py-2 rounded-xl glass-button glass-hover hover:-translate-y-0.5 transition will-change-transform',
      itemActive: 'group flex items-center gap-3 px-3 py-2 rounded-xl glass-badge',
      icon: 'w-5 h-5',
      text: 'text-sm font-medium'
    },

    // Status Badges
    badge: {
      base: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium glass-badge',
      success: 'glass-alert-success text-lime-200',
      warning: 'border-orange-400/20 text-orange-200',
      error: 'glass-alert text-red-300',
      info: 'border-cyan-400/20 text-cyan-300',
      pending: 'border-slate-400/20 text-slate-200'
    }
  },

  // Glass Effects
  effects: {
    glass: {
      sm: 'glass-morphism-subtle',
      md: 'glass-morphism',
      lg: 'glass-morphism-strong',
      xl: 'glass-morphism-light'
    }
  },

  // Accent Glows (for background effects)
  glows: {
    lime: {
      position: 'absolute -top-20 -left-16 w-80 h-80 rounded-full bg-lime-400/10 blur-3xl',
      positionAlt: 'absolute bottom-10 left-1/3 w-96 h-96 rounded-full bg-lime-400/10 blur-3xl'
    },
    orange: {
      position: 'absolute top-40 -right-10 w-96 h-96 rounded-full bg-orange-400/10 blur-3xl'
    },
    purple: {
      position: 'absolute bottom-10 left-1/3 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl'
    }
  }
};

// Utility functions for theme usage
export const getStatusColor = (status: string) => {
  const statusMap: Record<string, keyof typeof dashboardTheme.colors.status> = {
    'DELIVERED': 'success',
    'SHIPPED': 'success', 
    'CONFIRMED': 'success',
    'PROCESSING': 'warning',
    'PENDING': 'pending',
    'CANCELLED': 'error',
    'FAILED': 'error'
  };
  
  return statusMap[status.toUpperCase()] || 'pending';
};

export const getStatusIcon = (status: string) => {
  const iconMap: Record<string, string> = {
    'DELIVERED': 'check-circle-2',
    'SHIPPED': 'truck',
    'CONFIRMED': 'check-circle-2', 
    'PROCESSING': 'loader',
    'PENDING': 'clock-4',
    'CANCELLED': 'x',
    'FAILED': 'alert-triangle'
  };
  
  return iconMap[status.toUpperCase()] || 'clock-4';
};

export default dashboardTheme;