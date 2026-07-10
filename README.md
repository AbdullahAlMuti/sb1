# SellerSuit — eBay Dropshipping & Listing Automation SaaS

SellerSuit is a production-grade monorepo containing an eBay dropshipping toolkit. It enables dropshippers to import products from suppliers (like Amazon and Walmart) via a Chrome extension, normalize them into structured products, and list/manage them directly on eBay using a unified dashboard.

---

## 📌 Core Product Scope (eBay-Only)

> [!IMPORTANT]
> **Active Marketplace Scope: eBay only.**
>
> Shopify code and tables exist in the codebase but are **completely disabled and hidden**.
> - Do not write or modify Shopify integrations/workflows unless requested.
> - Do **never** delete Shopify code, drop Shopify tables, or remove Shopify database migrations.
> - For full scope details, please consult [AI_AGENT_SCOPE_EBAY_ONLY.md](file:///d:/eBay%20Software/2026sellersuit/sb1/AI_AGENT_SCOPE_EBAY_ONLY.md).

---

## 🏗️ Repository Architecture

SellerSuit is structured as a monorepo containing applications, shared packages, and a Supabase backend configuration.

```
├── apps/
│   ├── web/          # React SPA (Marketing site + authenticated User Dashboard; port 3001)
│   ├── extension/    # Manifest V3 Chrome Extension (Amazon/Walmart/Aliexpress scrapers & auto-lister)
│   ├── admin/        # Admin Panel (System management, user plans, config; port 3002)
│   └── marketing/    # Front-facing marketing site (port 3000)
│
├── packages/         # Shared `@repo/*` workspaces
│   ├── auth/         # React Auth context, custom useAuth hook, and ProtectedRoute guards
│   ├── api-client/   # Supabase API client singleton wrapping the Supabase JS SDK
│   ├── ui/           # Shared shadcn/ui components and design tokens
│   ├── types/        # TypeScript type declarations and generated Supabase database types
│   ├── marketplace-core/ # Common listing, calculation, pricing-engine, and variation logic
│   ├── config/       # Shared monorepo configuration files (ESLint, TSConfig, Prettier)
│   └── utils/        # Common utilities (formatting, parsing, error recovery)
│
└── supabase/         # Backend Database & Functions
    ├── functions/    # ~50 Deno Edge Functions (Stripe, eBay API calls, data sync, queues)
    └── migrations/   # Sequential PostgreSQL database migrations
```

---

## 📦 Key Components

### 1. Web Application (`apps/web`)
The client SPA built with React, Vite, and Tailwind CSS.
- **Port:** `3001`
- **Purpose:** Serve the user dashboard where sellers manage their eBay listings, sync orders, monitor pricing alerts, view reports, and manage subscription/billing credits.
- **Environment:** Reads configurations from the root `.env` or `.env.local` files.

### 2. Chrome Extension (`apps/extension`)
A Manifest V3 extension built in vanilla JavaScript and bundled with Vite.
- **Purpose:** Runs on supplier sites (Amazon, Walmart, AliExpress). It scrapes product info (titles, descriptions, pricing, variations, images) and communicates directly with the Supabase backend to push normalized products into the SellerSuit listing lifecycle.
- **Watch/Dev output:** Build logs generate outputs under `dist/extension-dev/` for local loading.

### 3. Admin Panel (`apps/admin`)
A separate administrative dashboard for managing the SaaS platform.
- **Port:** `3002`
- **Purpose:** Manage billing limits, view platform analytics, update system configs, and troubleshoot user issues.

### 4. Supabase Backend (`supabase/`)
The persistence, auth, and serverless compute layer.
- **Database:** PostgreSQL with Row Level Security (RLS) rules enabled on user-facing tables.
- **Edge Functions:** Handle server-side logic such as calling the eBay APIs, processing Stripe webhook payments, managing queue items, and background pricing updates.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js** (v18+ recommended) & **npm**
- **Supabase CLI** (optional, for local DB development)

### 2. Environment Variables
Create a `.env` (or `.env.local`) in the **repo root** directory:
```env
VITE_SUPABASE_URL=https://ojxzssooylmydystjvdo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-publishable-key>
```

### 3. Run Development Servers
To run all applications (Marketing, Web Dashboard, Admin Panel) and the Chrome Extension builder concurrently, run:
```bash
npm run dev:local
```
This runs the extension file watcher and mounts the web applications:
- Marketing: [http://localhost:3000](http://localhost:3000)
- Web App: [http://localhost:3001](http://localhost:3001)
- Admin App: [http://localhost:3002](http://localhost:3002)

To start individual components:
```bash
npm run dev            # Start only the Web App (port 3001)
npm run dev:admin      # Start only the Admin Panel (port 3002)
npm run dev:marketing  # Start only the Marketing site (port 3000)
```

---

## 🤖 Guide for AI Coding Agents

When working on this repository, please adhere to these core workflows:

1. **Read Scope Documents First**: Consult [AI_AGENT_SCOPE_EBAY_ONLY.md](file:///d:/eBay%20Software/2026sellersuit/sb1/AI_AGENT_SCOPE_EBAY_ONLY.md) and [AGENTS.md](file:///d:/eBay%20Software/2026sellersuit/sb1/AGENTS.md) before implementing features.
2. **Shopify Gating**: Shopify is disabled. Do not expose Shopify in the UI, do not recommend Shopify plans, but **do not delete** existing Shopify files or drop Shopify tables.
3. **Local-first Validation**: Always verify code changes locally before staging.
4. **Pre-release Quality Gates**: Run checks before preparing production builds:
   - `npm run check:local` (env check + typecheck + lint + build)
   - `npm run qa:local` (runs all validation gates + prepares dev extension)
   - `npm run typecheck` (tsc validation)
