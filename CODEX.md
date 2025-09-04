# CODEX.md - Project Context for US Custom Cap

This file mirrors the intent of `CLAUDE.md` and defines how I (Codex) work in this repository. It consolidates paths, guardrails, and the high‑level system overview so I can operate consistently and safely.

## Ops Checklist (Read First)
- Current task: `\Claude Instruction\currentTask.txt`
- Error reports / follow‑ups: `\Claude Instruction\errorReport.txt`
- Screenshots (when explicitly requested): `\Claude Instruction\Screenshots`
- General business context: `F:\Custom Cap - github\Claude Instruction\custom cap 101.txt`

## Special Routing Notes
- Support page uses isolated AI resources under `src\app\ai` with details in: `src\app\ai\instruction.txt`.
- Dashboard Admin – product create page: `src\app\dashboard\admin\products\create\page.tsx`.
- Advanced Product Page at `src\app\customize\[slug]` is off‑limits unless explicitly authorized.
- Do not add any hardcoded or imaginary data/logic unless explicitly requested.

## Project Overview
US Custom Cap is a Next.js 15 e‑commerce platform for custom baseball caps, featuring role‑based dashboards, advanced messaging, order management, and a modern UI with tier‑based pricing and volume discounts.

**Status**: Production Ready (v3.3.0)
**Completion**: ~96% — marketplace expansion phase in progress

## Tech Stack & Architecture
### Frontend
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS 4, Heroicons, Lucide React

### Backend & Data
- Supabase PostgreSQL with Prisma ORM
- NextAuth.js for authentication, `bcryptjs` for hashing
- Row Level Security policies

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
- Cart: session‑scoped cart state
- Message: categories, priorities, attachments
- Quote: quote request workflow

### Enums
- UserRole: CUSTOMER | MEMBER | ADMIN
- OrderStatus: PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED
- MessageCategory: ORDER | SUPPORT | BILLING | URGENT | GENERAL
- MessagePriority: LOW | NORMAL | HIGH | URGENT

## Design System
- Glass‑morphism surfaces with backdrop blur
- Centered layout with consistent spacing scale
- Color themes: Lime (primary), Orange (wholesale), Purple (supplier)
- Modern typography and smooth, subtle animations

## Pricing & Data Sources
Authoritative CSVs used by pricing/logic live in:
- `src\app\csv\Blank Cap Pricings.csv`
- `src\app\csv\Customer Products.csv`
- `src\app\csv\Customization Pricings.csv`
- Additional AI pricing inputs: `src\app\ai\Blank Cap\priceTier.csv`

Display rules include tier‑based pricing, volume discount visualization, and aggregation across logos, accessories, closures, and delivery options.

## AuthN/AuthZ
- Roles: CUSTOMER, MEMBER, ADMIN (Master Admin: `absrasel@gmail.com`)
- NextAuth.js sessions, middleware protection, input validation
- Prisma types for end‑to‑end typing and RLS policies for data safety

## Dashboards
### Admin
- Overview analytics: revenue, orders, users
- Order management: filters, status updates, tracking
- User management and role assignment
- Product management with Sanity integration
- Page builder & quote management tools

### Member
- Order history and reorders
- Saved orders, continue‑editing flows
- Profile management and messaging

## Messaging System
- iMessage‑style UI with bubbles
- File attachments and reply‑to behavior
- Category and priority tagging
- Optimistic send and contact‑support integration

## E‑commerce Flows
- Real‑time customization, color previews, size/qty controls
- Option selection (logos, accessories, closures)
- Live cost calculation and volume discounts
- Persistent cart with session storage

## Development Guidelines
- TypeScript first, Prisma‑generated types
- Consistent REST patterns and HTTP semantics
- Centralized error handling; avoid speculative logic/data
- Performance: optimistic UI, efficient queries, background tasks

## Scripts
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Run production
npm run lint     # ESLint

# Prisma
npx prisma generate
npx prisma db push
```

## Environment Variables (sample)
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

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@uscustomcap.com"
```

## How Codex Uses This File
- Always check the Ops Checklist before starting work.
- Respect Special Routing Notes; avoid touching restricted paths without approval.
- When implementing or debugging, use the CSVs and `src\app\ai` resources as primary data sources; do not fabricate values.
- If something is ambiguous, consult `currentTask.txt`, `errorReport.txt`, and the business context document, then ask for clarification.

