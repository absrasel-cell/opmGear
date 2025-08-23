# CLAUDE.md - Project Context for OPM Gear
read current main Task from ""F:\Custom Cap - github\Claude Instruction\currentTask.txt""
read current errors and follow up requests from "F:\Custom Cap - github\Claude Instruction\errorReport.txt"
Vercel deployment log "F:\Custom Cap - github\Claude Instruction\vercelBuildLog.txt"
current live web url "https://opm-gear-dk7lce111-absrasel-cells-projects.vercel.app"
Prodcut Page "F:\Custom Cap - github\customcap\src\app\customize\[slug]"

## 🎯 Project Overview
OPM Gear is a comprehensive Next.js 15 e-commerce platform for custom baseball cap customization and ordering. This is a production-ready application with advanced user management, real-time messaging, sophisticated order management, and modern UI with volume-based pricing systems.

**Status**: Production Ready (Version 3.2.1)  
**Completion**: 95% - Core features complete, payment integration in progress

## 🛠️ Tech Stack & Architecture

### Frontend
- **Next.js 15.4.6** with App Router
- **React 19.1.0** with TypeScript 5
- **Tailwind CSS 4** with glass morphism design system
- **Heroicons** and **Lucide React** for icons

### Backend & Database
- **Supabase PostgreSQL** with Prisma ORM 6.14.0
- **NextAuth.js 4.24.11** for authentication
- **bcryptjs** for password hashing
- **Row Level Security** for data protection

### External Services
- **Sanity.io** - Headless CMS for product management
- **Webflow** - Additional product catalog integration

## 🗂️ Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── api/                # 30+ API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── admin/          # Admin management
│   │   ├── orders/         # Order management
│   │   ├── messages/       # Messaging system
│   │   ├── sanity/         # CMS integration
│   │   ├── cart/           # Shopping cart
│   │   └── users/          # User management
│   ├── dashboard/          # Role-based dashboards
│   │   ├── admin/          # Admin interface
│   │   └── member/         # Member interface
│   ├── customize/          # Product customization
│   ├── cart/               # Shopping cart
│   ├── checkout/           # Checkout process
│   └── messages/           # Messaging interface
├── components/             # Reusable React components
│   ├── auth/              # Authentication components
│   ├── cart/              # Cart components
│   └── forms/             # Form components
└── lib/                   # Utility libraries
```

## 🗄️ Database Schema (PostgreSQL)

### Core Models
- **User**: Authentication, roles (CUSTOMER, MEMBER, ADMIN), profiles
- **Order**: Complete order management with status tracking
- **Cart**: Shopping cart with session management
- **Message**: Advanced messaging system with categories and priorities
- **Quote**: Quote request management

### Key Enums
- **UserRole**: CUSTOMER, MEMBER, ADMIN
- **OrderStatus**: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
- **MessageCategory**: ORDER, SUPPORT, BILLING, URGENT, GENERAL
- **MessagePriority**: LOW, NORMAL, HIGH, URGENT

## 🎨 Design System

### Visual Design
- **Glass Morphism Interface**: Sophisticated backdrop blur effects
- **Centered Layout**: Perfectly centered content with optimal spacing
- **Color Theming**: Lime (primary), Orange (wholesale), Purple (supplier)
- **Modern Typography**: Clean font hierarchy with proper contrast
- **Smooth Animations**: Fade-in effects with staggered delays

### UI Features
- Real-time pricing calculations with volume discounts
- Interactive statistics with navigation
- Modern form design with validation
- Touch-friendly mobile interfaces
- Loading states and error handling

## 💰 Pricing System

### Tier-Based Pricing (CSV Integration)
- **Tier 1**: $1.80, $1.50, $1.45, $1.42, $1.38, $1.35
- **Tier 2**: $2.20, $1.60, $1.50, $1.45, $1.40, $1.35
- **Tier 3**: $2.40, $1.70, $1.60, $1.47, $1.44, $1.41

### Volume Discount Display
- Visual discount system with crossed-out prices
- Comprehensive coverage: logos, accessories, closures, delivery
- Savings notifications with exact amounts
- Complex logo handling for combined costs

## 🔐 Authentication & Authorization

### User Roles
- **CUSTOMER**: Basic e-commerce access
- **MEMBER**: Enhanced dashboard with order history
- **ADMIN**: Full administrative access
- **Master Admin**: Supreme privileges for `absrasel@gmail.com`

### Security Features
- Supabase authentication with secure sessions
- Middleware-based route protection
- Row Level Security policies
- Input validation and sanitization
- CSRF protection

## 📊 Dashboard Features

### Admin Dashboard
- **Overview Analytics**: Revenue tracking, order breakdowns, user analytics
- **Order Management**: Advanced filtering, status updates, tracking numbers
- **User Management**: Role assignment, user analytics
- **Product Management**: Full CRUD with Sanity CMS integration
- **Page Builder**: Visual content management system
- **Quote Management**: Customer communication tools

### Member Dashboard
- **Order History**: Complete order tracking and reorder functionality
- **Saved Orders**: Continue editing and checkout capabilities
- **Profile Management**: Personal settings and statistics
- **Messaging**: Direct communication with admin team

## 💬 Advanced Messaging System

### Features
- **iMessage-Style UI**: Modern chat interface with bubbles
- **File Attachments**: Images, documents, other files
- **Message Categories**: Order, Support, Billing, Urgent, General
- **Priority Levels**: Low, Normal, High, Urgent
- **Reply-to Functionality**: Right-click to reply
- **Optimistic UI**: Instant message sending
- **Contact Support Integration**: Pre-filled order context

## 🛒 E-commerce Features

### Product Customization
- Real-time cap customization interface
- Color selection with visual preview
- Size and quantity management
- Option selection (logos, accessories, closures)
- Dynamic cost calculation

### Shopping Cart
- Persistent cart with session storage
- Real-time updates and calculations
- Tier-based pricing integration
- Volume discount display

### Order Management
- Complete order lifecycle
- Status tracking and updates
- Reorder functionality
- Saved order management

## 🔧 Development Guidelines

### Code Quality
- **TypeScript**: Full type safety with Prisma-generated types
- **ESLint**: Next.js configuration
- **Error Handling**: Comprehensive error handling patterns
- **Performance**: Optimistic UI, efficient queries, background operations

### API Patterns
- RESTful API design
- Consistent error responses
- Authentication middleware
- Input validation
- Proper HTTP status codes

### Testing
- Manual testing completed for all major features
- API endpoint testing
- Error handling validation
- Performance testing

## 📈 Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema to database
```

## 🔑 Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID="..."
NEXT_PUBLIC_SANITY_DATASET="..."
SANITY_API_TOKEN="..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

## 🚀 Current Status & Next Steps

### ✅ Completed (95%)
- Complete authentication system with role-based access
- Advanced messaging with file attachments
- Comprehensive admin dashboard
- Complex product customization interface (3500+ lines)
- Shopping cart and order management
- Tier-based pricing system with volume discounts
- Modern UI with glass morphism design
- Database migration to PostgreSQL
- Sanity CMS integration
- Recent UI improvements: shipment integration, color themes, layout optimizations

### 🔄 **CURRENT FOCUS: Multi-Vendor Marketplace Expansion**

#### **Phase 1: Supplier Integration**
1. **Supplier Dashboard**: Copy admin dashboard, remove admin features, add product upload
2. **Product Separation**: Simple inventory products vs complex custom caps
3. **Store Page Enhancement**: Filters, supplier product visibility
4. **Reseller Features**: Additional sidebar options for resale members

#### **Phase 2: Order & Billing System**
5. **Invoice Generation**: Checkout invoice system
6. **Billing & Accounts**: Resale pricing implementation
7. **Order Validation**: Data consistency testing across dashboard/input

### 📋 Future Roadmap
- Payment integration (Stripe gateway)
- Email notification system
- Mobile app development
- Real-time WebSocket integration
- Advanced analytics dashboard

## 📚 Documentation Files

Key documentation for reference:
- `PRODUCT_CLIENT_MAPPING.md` - **NEW**: Complete mapping of 3500+ line productClient.tsx
- `PROJECT_STATUS_SUMMARY.md` - Complete project status
- `PROJECT_GOALS.md` - Detailed goals and progress
- `DASHBOARD_FEATURES.md` - Dashboard functionality
- `UI_DESIGN_SYSTEM.md` - Design system documentation
- `DATABASE_ARCHITECTURE.md` - Database design
- `AUTHENTICATION_SETUP.md` - Auth system details
- `PRICING_SYSTEM_DOCUMENTATION.md` - Pricing implementation

## 🎯 Key Context for AI Assistance

### When working on this project:
1. **Follow existing patterns**: Maintain TypeScript safety, use Prisma for DB ops
2. **Respect the design system**: Use glass morphism, color theming, animations
3. **Security first**: Proper authentication, input validation, role-based access
4. **Performance matters**: Optimistic UI, efficient queries, proper caching
5. **User experience**: Modern UI, responsive design, error handling

### Common tasks:
- API endpoint creation follows `/api/*` structure
- Database operations use Prisma ORM
- Authentication checks use Supabase
- UI components follow Tailwind + glass morphism patterns
- File uploads use configured upload system
