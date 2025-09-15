# CODEX.md - Project Context for US Custom Cap

This file mirrors the intent of `CLAUDE.md` and defines how I (Codex) work in this repository. It consolidates paths, guardrails, and the high-level system overview so I can operate consistently and safely.

## Ops Checklist (Read First)
- Current task: `\Claude Instruction\currentTask.txt`
- Error reports / follow-ups: `\Claude Instruction\errorReport.txt`
- Screenshots (only if asked): `\Claude Instruction\Screenshots`
- General business context: `F:\Custom Cap - github\Claude Instruction\custom cap 101.txt`
- Team TODO list (fullstack-cap-engineer): `F:\Custom Cap - github\Claude Instruction\todo list.txt`

## Special Routing Notes
- Support Page resources live under: `src\app\ai`
- Support Page complete memory (ALWAYS READ FIRST): `F:\Custom Cap - github\Claude Instruction\SUPPORT_PAGE_MEMORY.md`
- Dashboard Admin product create page: `src\app\dashboard\admin\products\create\page.tsx`
- Advanced Product Page is restricted: `src\app\customize\[slug]` (do not change without approval)
- Do not add any hardcoded or imaginary data/logic unless explicitly requested

## Project Overview
US Custom Cap is a Next.js 15 e-commerce platform for custom baseball caps, featuring role-based dashboards, advanced messaging, order management, and a modern UI with volume/tier-based pricing.

**Status**: Production Ready (v3.4.0)
**Completion**: ~97% - marketplace expansion phase in progress
**Latest Update**: Complete pricing system migration to Supabase database (January 2025)

## Tech Stack & Architecture
### Frontend
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS 4, Heroicons, Lucide React

### Backend & Data
- Supabase PostgreSQL with Row Level Security
- NextAuth.js for authentication, `bcryptjs` for hashing
- No Prisma - use Supabase directly; use Supabase MCP for DB tasks

### External Services
- Sanity.io for headless CMS
- Webflow for supplemental catalog content

## Project Structure (high level)
```
src/
  app/                # App Router and routes
    api/              # API endpoints
    dashboard/        # Role-based dashboards
    customize/        # Product customization (do not change without approval)
    cart/ checkout/   # Cart and checkout
    ai/               # AI resources and instructions
  components/         # Reusable UI components
  lib/                # Utilities and shared libs
```

## Database Model (PostgreSQL)
### Core Entities
- User: auth, roles (CUSTOMER, MEMBER, ADMIN), profiles
- Order: lifecycle and status tracking
- Cart: session-scoped cart state
- Message: categories, priorities, attachments
- Quote: quote request workflow

### Enums
- UserRole: CUSTOMER | MEMBER | ADMIN
- OrderStatus: PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED
- MessageCategory: ORDER | SUPPORT | BILLING | URGENT | GENERAL
- MessagePriority: LOW | NORMAL | HIGH | URGENT

## Design System
- Glass-morphism surfaces with backdrop blur
- Centered layout with consistent spacing scale
- Color themes: Lime (primary), Orange (wholesale), Purple (supplier)
- Modern typography and smooth, subtle animations

## Pricing System
- Source of truth: Supabase database via `PricingService` (CSV-based pricing is deprecated)
- Tier-based pricing, volume discounts, and aggregation across logos, accessories, closures, and delivery options

## AuthN/AuthZ
- Roles: CUSTOMER, MEMBER, ADMIN (Master Admin: `absrasel@gmail.com`)
- NextAuth.js sessions, middleware protection, input validation
- RLS policies in Supabase for data safety

## Dashboards
### Admin
- Overview analytics: revenue, orders, users
- Order management: filters, status updates, tracking
- User management and role assignment
- Product management with Sanity integration
- Page builder & quote management tools

### Member
- Order history and reorders
- Saved orders, continue-editing flows
- Profile management and messaging

## Messaging System
- iMessage-style UI with bubbles
- File attachments and reply-to behavior
- Category and priority tagging
- Optimistic send and contact-support integration

## E-commerce Flows
- Real-time customization, color previews, size/qty controls
- Option selection (logos, accessories, closures)
- Live cost calculation and volume discounts
- Persistent cart with session storage

## Development Guidelines
- TypeScript-first
- Consistent REST patterns and HTTP semantics
- Centralized error handling; avoid speculative logic/data
- Performance: optimistic UI, efficient queries, background tasks
- Database: Supabase only (no Prisma); use Supabase MCP for DB tasks

## Scripts
```
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Run production
npm run lint     # ESLint
```

## Environment Variables (sample)
```
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

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@uscustomcap.com"
```

## How Codex Uses This File
- Always check the Ops Checklist before starting work
- Respect Special Routing Notes; avoid touching restricted paths without approval
- Use Supabase (not Prisma) and the PricingService for any pricing/data operations
- For support page work, read the Support Page memory first
- If something is ambiguous, consult `currentTask.txt`, `errorReport.txt`, the TODO list, and business context, then ask for clarification

