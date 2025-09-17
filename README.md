# CustomCap - Custom Baseball Caps E-commerce Platform

## 🎯 Project Overview

CustomCap is a comprehensive Next.js 15 e-commerce platform for custom baseball cap customization and ordering. The platform features advanced user management, real-time messaging, sophisticated order management, and a modern UI with volume-based pricing systems.

## 🚀 Key Features

### Core E-commerce Features
- **Product Customization**: Real-time cap customization with color selection, logo setup, and accessories
- **Dynamic Pricing**: Tier-based pricing system with volume discounts (Tier 1, 2, 3)
- **Shopping Cart**: Persistent cart with session storage and real-time updates
- **Order Management**: Complete order lifecycle from creation to delivery
- **Quote Request System**: Customer quote requests with admin management

### User Management & Authentication
- **Role-Based Access**: Customer, Member, and Admin roles with proper permissions
- **Supabase Authentication**: Secure authentication with session management
- **User Profiles**: Comprehensive profile management with statistics
- **Protected Routes**: Middleware-based route protection

### Advanced Messaging System
- **iMessage-Style UI**: Modern chat interface with bubbles and animations
- **File Attachments**: Support for images, documents, and other files
- **Message Categories**: Order, Support, Billing, Urgent, General
- **Priority Levels**: Low, Normal, High, Urgent
- **Reply-to Functionality**: Right-click to reply to specific messages
- **Real-time Features**: Unread counts, notifications, chronological ordering

### Admin Dashboard
- **Comprehensive Admin Interface**: Complete admin dashboard with role-based access control
- **Overview Analytics**: Real-time statistics with revenue tracking, order breakdowns, and user analytics
- **Order Management**: Advanced order filtering, status updates, tracking number management, and detailed order views
- **User Management**: Complete user administration with role management and user analytics
- **Quote Request Management**: Quote request handling with customer communication tools
- **Product Management**: Full product CRUD operations with Sanity CMS integration, image uploads, and inventory management
- **Page Builder**: Visual content management system for creating and editing website pages
- **Master Admin Access**: Special privileges for system-wide control and management

### Technical Features
- **TypeScript**: Full type safety with Prisma-generated types
- **PostgreSQL Database**: Supabase with Prisma ORM
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Performance Optimized**: Optimistic UI, efficient queries, background operations

## 🛠 Tech Stack

### Frontend
- **Next.js 15.4.6**: React framework with App Router
- **React 19.1.0**: Latest React with concurrent features
- **TypeScript 5**: Full type safety
- **Tailwind CSS 4**: Utility-first CSS framework
- **Heroicons**: Icon library

### Backend & Database
- **Supabase**: PostgreSQL database with authentication
- **Prisma 6.14.0**: Type-safe database ORM
- **NextAuth.js 4.24.11**: Authentication library
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT handling

### External Services
- **Sanity.io**: Headless CMS for product management
- **Webflow**: Additional product catalog integration

### Development Tools
- **ESLint**: Code linting
- **PostCSS**: CSS processing
- **Node.js**: Runtime environment

## 📁 Project Structure

```
customcap/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (30+ endpoints)
│   │   ├── dashboard/         # Admin and member dashboards with comprehensive management tools
│   │   ├── customize/         # Product customization pages
│   │   ├── cart/              # Shopping cart
│   │   ├── checkout/          # Checkout process
│   │   ├── messages/          # Messaging system
│   │   └── auth/              # Authentication pages
│   ├── components/            # Reusable React components
│   │   ├── auth/             # Authentication components
│   │   ├── cart/             # Cart-related components
│   │   └── forms/            # Form components
│   └── lib/                  # Utility libraries
├── prisma/                   # Database schema and migrations
├── public/                   # Static assets
└── docs/                     # Project documentation
```

## 🗄 Database Schema

### Core Models
- **User**: Authentication, roles, profiles
- **Order**: Complete order management with status tracking
- **Cart**: Shopping cart with session management
- **Message**: Advanced messaging system with categories
- **Quote**: Quote request management

### Key Enums
- **UserRole**: CUSTOMER, MEMBER, ADMIN
- **OrderStatus**: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
- **MessageCategory**: ORDER, SUPPORT, BILLING, URGENT, GENERAL
- **MessagePriority**: LOW, NORMAL, HIGH, URGENT

## 🔌 API Endpoints

### Authentication & Users
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Session management
- `GET /api/user/profile` - User profile data
- `POST /api/user/change-password` - Password updates
- `GET /api/user/stats` - User analytics

### Orders & Cart
- `POST /api/orders` - Create orders
- `GET /api/orders` - List orders
- `GET /api/orders/[id]` - Order details
- `POST /api/cart` - Cart management
- `POST /api/calculate-cost` - Cost calculations

### Messaging
- `GET /api/messages` - List messages
- `POST /api/messages` - Send messages
- `PUT /api/messages/[id]` - Update messages
- `POST /api/messages/support-recipient` - Support messaging

### Admin & Management
- `GET /api/admin/messages` - Admin message management
- `POST /api/admin/users` - User management
- `POST /api/quote-requests` - Quote management
- `POST /api/upload` - File uploads
- `GET /api/users` - User listing and management
- `PATCH /api/orders/[id]` - Order status and tracking updates
- `GET /api/sanity/pages` - Page management
- `POST /api/sanity/pages` - Create new pages
- `PATCH /api/sanity/pages/[id]` - Update pages
- `GET /api/sanity/sections` - Section management

### Pricing & Products
- `GET /api/blank-cap-pricing` - Dynamic pricing lookup
- `GET /api/customization-pricing` - Customization pricing
- `GET /api/sanity/products` - Sanity CMS products
- `GET /api/sanity/categories` - Product categories

## 🎨 UI/UX Features

### Design System
- **Modern Glass Morphism Interface**: Sophisticated glass/FinanceFlow-styled design with backdrop blur effects
- **Centered Layout**: Perfectly centered content with optimal spacing and visual hierarchy
- **Responsive Design**: Mobile-first approach with touch-friendly interfaces
- **Smooth Animations**: Fade-in animations with staggered delays for polished user experience
- **Loading States**: Smooth loading animations with spinner icons and skeleton screens
- **Error Handling**: Comprehensive error handling with user-friendly feedback
- **Toast Notifications**: Real-time user feedback system with smooth transitions

### Visual Design Elements
- **Background Glows**: Subtle gradient glows (lime, purple, orange) with blur effects
- **Glass Cards**: Translucent cards with backdrop blur and subtle borders
- **Color-Coded Elements**: Consistent color theming (lime for primary, orange for wholesale, purple for supplier)
- **Modern Typography**: Clean font hierarchy with proper spacing and contrast
- **Interactive Elements**: Hover effects, transitions, and micro-interactions

### Customization Interface
- **Real-time Updates**: Instant price calculations and visual feedback
- **Color Selection**: Multiple color options with visual preview
- **Volume Discounts**: Visual discount display with savings calculations and crossed-out pricing
- **Option Management**: Size, quantity, and feature selection with modern card-based UI
- **Image Gallery**: Product images with color extraction and hover effects
- **Modern Form Design**: Clean, card-based form elements with proper spacing and validation

### Dashboard Features
- **Admin Dashboard**: Comprehensive admin interface with role-based access control, real-time analytics, order management, user administration, product management, and page builder
- **Member Dashboard**: Modern glass morphism interface with order history, saved orders, quote requests, and profile management
- **Interactive Statistics**: Clickable stats with navigation and hover effects for quick access to detailed views
- **Advanced Order Management**: Order filtering, status updates, tracking number management, and detailed order analytics
- **Real-time Updates**: Live status updates and notifications across all dashboard components
- **Product Management**: Full CRUD operations with Sanity CMS integration, image uploads, and inventory tracking
- **Page Builder**: Visual content management system for creating and editing website pages with drag-and-drop functionality
- **Modern UI Design**: Glass morphism cards with backdrop blur effects, smooth animations, and responsive design

## 🔐 Security Features

### Authentication & Authorization
- **Supabase Auth**: Secure authentication with session management
- **Role-Based Access**: Granular permissions for different user types
- **Protected Routes**: Middleware-based route protection
- **Password Security**: bcrypt hashing with secure password policies

### Data Protection
- **Row Level Security**: Database-level security policies
- **Input Validation**: Comprehensive form validation
- **CSRF Protection**: Cross-site request forgery protection
- **Secure Headers**: Security headers implementation

## 📊 Performance Optimizations

### Frontend Performance
- **Optimistic UI**: Instant message sending with background sync
- **Efficient Loading**: Scoped queries and proper indexing
- **Background Operations**: Non-blocking read receipts and updates
- **Image Optimization**: Next.js Image component with optimization

### Database Performance
- **PostgreSQL**: High-performance database with proper indexing
- **Prisma ORM**: Efficient query generation and caching
- **Connection Pooling**: Optimized database connections
- **Query Optimization**: Proper indexing and query scoping

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Supabase recommended)
- Sanity.io account (for CMS features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd customcap
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following environment variables:
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

4. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📈 Development Workflow

### Code Quality
- **TypeScript**: Full type safety throughout the application
- **ESLint**: Code linting with Next.js configuration
- **Prettier**: Code formatting (recommended)
- **Git Hooks**: Pre-commit hooks for code quality

### Testing Strategy
- **API Testing**: Comprehensive API endpoint testing
- **Component Testing**: React component testing
- **Integration Testing**: End-to-end workflow testing
- **Performance Testing**: Load and performance testing

### Deployment
- **Vercel**: Recommended deployment platform
- **Environment Variables**: Secure environment configuration
- **Database Migrations**: Automated migration deployment
- **CI/CD**: Automated testing and deployment pipeline

## 🔧 Configuration Files

### Key Configuration Files
- `next.config.ts` - Next.js configuration with image optimization
- `prisma/schema.prisma` - Database schema definition
- `tailwind.config.js` - Tailwind CSS configuration
- `eslint.config.mjs` - ESLint configuration
- `tsconfig.json` - TypeScript configuration

### Environment Variables
- Database connection strings
- Authentication secrets
- External service API keys
- Feature flags and configuration

## 📚 Documentation

### Project Documentation
- `PROJECT_GOALS.md` - Detailed project goals and progress
- `PROJECT_STATUS_SUMMARY.md` - Current project status and completed features
- `DASHBOARD_FEATURES.md` - Comprehensive dashboard features and capabilities
- `UI_DESIGN_SYSTEM.md` - Comprehensive UI design system and component library
- `DATABASE_ARCHITECTURE.md` - Database design documentation
- `AUTHENTICATION_SETUP.md` - Authentication system documentation
- `SANITY_INTEGRATION.md` - CMS integration guide
- `PRICING_SYSTEM_DOCUMENTATION.md` - Pricing system details

### API Documentation
- RESTful API endpoints with TypeScript types
- Request/response schemas
- Authentication requirements
- Error handling patterns

## 🤝 Contributing

### Development Guidelines
- Follow TypeScript best practices
- Use Prisma for all database operations
- Implement proper error handling
- Write comprehensive tests
- Follow the established code style

### Code Review Process
- Pull request reviews required
- Automated testing on all changes
- Performance impact assessment
- Security review for sensitive changes

## 📞 Support

### Technical Support
- GitHub Issues for bug reports
- Documentation for common questions
- Development team for complex issues

### User Support
- In-app messaging system
- Email support for customers
- Admin dashboard for support management

## 📄 License

This project is proprietary software. All rights reserved.

---

**Last Updated**: January 2025  
**Version**: 3.2.1  
**Status**: Production Ready with Comprehensive Dashboard Features  
**Next Release**: Version 4.0.0 (Payment Integration)
