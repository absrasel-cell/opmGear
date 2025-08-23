# CustomCap UI Design System

## 🎨 Design Philosophy

CustomCap features a sophisticated **Glass Morphism** design system inspired by modern financial applications, creating a premium, professional user experience with depth, transparency, and visual hierarchy.

## 🎯 Core Design Principles

### 1. Glass Morphism
- **Backdrop Blur**: Subtle blur effects for depth and focus
- **Transparency**: Semi-transparent elements with proper contrast
- **Layered Design**: Multiple visual layers for depth perception
- **Subtle Borders**: Fine borders and shadows for definition

### 2. Centered Layout
- **Perfect Centering**: Content perfectly centered both horizontally and vertically
- **Optimal Spacing**: Generous spacing for breathing room and readability
- **Visual Hierarchy**: Clear information hierarchy with proper typography
- **Responsive Design**: Mobile-first approach with touch-friendly interfaces

### 3. Color System
- **Primary (Lime)**: `#84cc16` - Used for primary actions, success states, and member accounts
- **Wholesale (Orange)**: `#f97316` - Used for wholesale-specific elements and business features
- **Supplier (Purple)**: `#8b5cf6` - Used for supplier/manufacturer features and admin elements
- **Neutral (Slate)**: `#64748b` - Used for text, borders, and subtle elements
- **Background**: Dark theme with gradient overlays and glow effects

## 🎨 Visual Elements

### Background System
```css
/* Background glows with blur effects */
.bg-lime-400/15 blur-[120px]    /* Primary glow */
.bg-purple-500/15 blur-[120px]  /* Secondary glow */
.bg-orange-500/15 blur-[120px]  /* Accent glow */
```

### Glass Cards
```css
/* Standard glass card styling */
.rounded-2xl bg-white/5 border border-white/10 
backdrop-blur-xl ring-1 ring-white/5 
shadow-[0_0_0_1px_rgba(255,255,255,0.06)]
```

### Form Elements
```css
/* Input styling */
.rounded-xl bg-black/30 border border-white/10 
px-3 py-2 text-white placeholder:text-slate-500 
focus:outline-none focus:ring-2 focus:ring-lime-400/60
```

## 🎭 Component Library

### Buttons

#### Primary Button
```jsx
<button className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 text-black px-4 py-2.5 font-medium shadow-[0_10px_40px_-10px_rgba(132,204,22,0.6)] hover:-translate-y-0.5 transition disabled:opacity-50">
  Button Text
</button>
```

#### Secondary Button
```jsx
<button className="inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white hover:text-lime-300 hover:border-lime-300/40 transition">
  Button Text
</button>
```

### Cards

#### Standard Card
```jsx
<div className="rounded-2xl bg-white/5 border border-white/10 p-6 md:p-8 backdrop-blur-xl ring-1 ring-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
  Card Content
</div>
```

#### Interactive Card
```jsx
<div className="relative p-4 rounded-xl border cursor-pointer select-none transition-all duration-200 bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20">
  Interactive Content
</div>
```

### Form Components

#### Input Field
```jsx
<input 
  className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400/60"
  placeholder="Enter text..."
/>
```

#### Select Dropdown
```jsx
<select className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-lime-400/60">
  <option value="">Select...</option>
</select>
```

#### Checkbox
```jsx
<input 
  type="checkbox" 
  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30 text-lime-400 focus:ring-lime-400/60"
/>
```

## 🎨 Layout System

### Page Container
```jsx
<div className="relative min-h-screen text-slate-200">
  {/* Background glows */}
  <div className="absolute inset-0 -z-10 pointer-events-none">
    <div className="absolute -top-24 -left-24 h-[480px] w-[480px] rounded-full bg-lime-400/15 blur-[120px]" />
    <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-purple-500/15 blur-[120px]" />
    <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[120px]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.035),_transparent_60%)]" />
  </div>
  
  {/* Content */}
  <div className="min-h-screen flex items-center justify-center px-6 md:px-10 py-12">
    <div className="w-full max-w-2xl">
      {/* Page content */}
    </div>
  </div>
</div>
```

### Grid System
```jsx
{/* Two-column grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
</div>

{/* Full-width section */}
<div className="sm:col-span-2">
  Full-width content
</div>
```

## 🎭 Animation System

### Fade-in Animation
```css
@keyframes fadeInUp { 
  0% { 
    opacity: 0; 
    transform: translateY(16px) scale(0.98); 
    filter: blur(6px); 
  } 
  100% { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
    filter: blur(0); 
  } 
}

.reveal { 
  opacity: 0; 
  animation: fadeInUp 0.9s ease-out forwards; 
  animation-delay: var(--delay, 0s); 
}
```

### Hover Effects
```css
/* Button hover */
.hover:-translate-y-0.5 transition

/* Card hover */
.hover:bg-white/10 hover:border-white/20 transition-all duration-200

/* Link hover */
.hover:text-lime-300 hover:text-white underline underline-offset-4
```

## 🎨 Typography

### Font Hierarchy
```css
/* Headings */
.text-3xl font-semibold tracking-tight text-white  /* Main heading */
.text-2xl font-semibold tracking-tight text-white  /* Section heading */
.text-xl font-medium text-white/90                 /* Subsection heading */

/* Body text */
.text-sm text-slate-300                            /* Primary text */
.text-xs text-slate-500                            /* Secondary text */
.text-xs text-slate-400                            /* Descriptive text */

/* Interactive text */
.text-lime-300 hover:text-white                    /* Links */
.text-red-400                                      /* Error messages */
```

## 🎨 State Management

### Loading States
```jsx
{isLoading ? (
  <>
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    Loading...
  </>
) : (
  <>Button Text</>
)}
```

### Error States
```jsx
{errors.fieldName && (
  <p className="mt-1 text-sm text-red-400">{errors.fieldName}</p>
)}
```

### Success States
```jsx
<div className="rounded-xl bg-green-500/10 border border-green-400/30 text-green-300 px-4 py-3 text-sm">
  Success message
</div>
```

## 🎨 Interactive Components

### Membership Selector
```jsx
<label className={`relative p-4 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
  accountType === t
    ? t === "Wholesale"
      ? "bg-orange-400/10 text-orange-300 border-orange-400/50 ring-1 ring-orange-400/30"
      : t === "Supplier"
      ? "bg-purple-500/10 text-purple-300 border-purple-500/50 ring-1 ring-purple-500/30"
      : "bg-lime-400/10 text-lime-300 border-lime-400/50 ring-1 ring-lime-400/30"
    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20"
}`}>
  {/* Radio button indicator */}
  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
    accountType === t
      ? t === "Wholesale"
        ? "border-orange-400 bg-orange-400"
        : t === "Supplier"
        ? "border-purple-500 bg-purple-500"
        : "border-lime-400 bg-lime-400"
      : "border-white/30"
  }`}>
    {accountType === t && (
      <div className="w-2 h-2 rounded-full bg-white" />
    )}
  </div>
  
  {/* Content */}
  <div>
    <div className="font-medium">Account Type</div>
    <div className="text-xs text-slate-400 mt-1">Description</div>
  </div>
  
  {/* Checkmark */}
  {accountType === t && (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
      t === "Wholesale"
        ? "bg-orange-400 text-black"
        : t === "Supplier"
        ? "bg-purple-500 text-white"
        : "bg-lime-400 text-black"
    }`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )}
</label>
```

## 🎨 Responsive Design

### Breakpoints
```css
/* Mobile first approach */
.sm:grid-cols-2    /* 640px and up */
.md:px-10          /* 768px and up */
.lg:max-w-4xl      /* 1024px and up */
.xl:max-w-6xl      /* 1280px and up */
```

### Mobile Optimizations
- Touch-friendly button sizes (minimum 44px)
- Proper spacing for thumb navigation
- Simplified layouts for small screens
- Optimized form inputs for mobile keyboards

## 🎨 Accessibility

### ARIA Labels
```jsx
<button aria-label="Show password" onClick={() => setShowPassword(!showPassword)}>
  <svg>...</svg>
</button>
```

### Focus Management
```jsx
<input 
  className="focus:outline-none focus:ring-2 focus:ring-lime-400/60"
  autoComplete="email"
  required
/>
```

### Color Contrast
- All text meets WCAG AA contrast requirements
- Error states use high-contrast red colors
- Interactive elements have clear hover states

## 🎨 Performance Considerations

### Animation Performance
- Use `transform` and `opacity` for animations
- Avoid animating layout properties
- Use `will-change` sparingly
- Implement `prefers-reduced-motion` support

### Loading Optimization
- Skeleton screens for content loading
- Progressive enhancement
- Optimistic UI updates
- Background data fetching

---

**Last Updated**: January 2025  
**Version**: 3.2.1  
**Design System**: Glass Morphism / FinanceFlow Style
