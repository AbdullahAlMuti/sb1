# 00 - Repository Inventory

Generated: 2026-06-04  
Repository root: `D:\eBay Software\2026sellersuit\sb1`

## Executive Inventory

SellerSuit is a monorepo for a multi-app SaaS product centered on eBay, Shopify, Amazon, and browser-extension workflows. The repository contains React/Vite frontends, shared TypeScript packages, a Chrome extension, Supabase Edge Functions, and Supabase Postgres migrations.

The system is best described as a serverless modular monolith:

- Frontend apps are separated by user surface: marketing, customer web app, admin app, and extension.
- Backend logic is implemented mainly as Supabase Edge Functions.
- Supabase Postgres is the central data, auth, policy, and tenant isolation layer.
- Shared packages centralize auth, Supabase client creation, API types, UI, marketplace utilities, and config.

## Top-Level Structure

| Path | Purpose |
| --- | --- |
| `apps/marketing` | Public marketing website, Vite React app, configured for port 3000. |
| `apps/web` | Customer web application, dashboard, integrations, marketplace workflows, configured for port 3001. |
| `apps/admin` | Admin console, user support, settings, subscription/admin workflows, configured for port 3002. |
| `apps/extension` | Browser extension source, manifests, content scripts, shared extension modules, and verification scripts. |
| `packages/api-client` | Shared Supabase client and API helpers. |
| `packages/auth` | Shared auth provider, route guards, admin checks, subscription checks, and auth UI helpers. |
| `packages/config` | Shared configuration package. |
| `packages/marketplace-core` | Marketplace domain package. |
| `packages/types` | Shared TypeScript types. |
| `packages/ui` | Shared UI components. |
| `packages/utils` | Shared utilities. |
| `supabase/functions` | Edge Functions for auth, Stripe, extension sessions, listings, orders, admin operations, AI generation, and integrations. |
| `supabase/migrations` | Postgres schema, RLS policies, functions, indexes, storage policies, extension tables, and admin command-center schema. |
| `services/*` | Placeholder service directories for marketplace adapters, sync workers, and webhooks. Current contents are `.gitkeep` only. |
| `scripts` | Utility and verification scripts. |
| `docs` | Existing documentation plus this audit. |

## File Inventory

Approximate non-generated repository inventory from `rg --files` excluding `node_modules`, `.git`, `dist`, `build`, `coverage`, `logs`, and cache folders:

| Area | Approximate files |
| --- | ---: |
| `apps` | 616 |
| `supabase` | 116 |
| `packages` | 91 |

Common file types:

| Extension | Approximate count |
| --- | ---: |
| `.tsx` | 262 |
| `.js` | 182 |
| `.ts` | 101 |
| `.png` | 84 |
| `.sql` | 55 |
| `.json` | 39 |
| `.css` | 30 |
| `.html` | 30 |
| `.md` | 22 |
| `.cjs` | 16 |

## Package And Runtime Stack

Evidence: `package.json`, app package manifests, Supabase functions, and migration files.

| Layer | Technology |
| --- | --- |
| Runtime | Node/npm workspace monorepo, Vite apps, Supabase Edge Functions on Deno. |
| Frontend | React 18, Vite 7, React Router 6, TanStack Query, Tailwind-style config, shared UI package. |
| Auth | Supabase Auth plus custom OTP Edge Function and custom extension session tokens. |
| Backend | Supabase Edge Functions, PostgREST, RPC functions, Supabase Storage policies. |
| Database | Supabase Postgres with RLS, Postgres functions, triggers, indexes, and extensions. |
| Payments | Stripe checkout, customer portal, and webhook Edge Functions. |
| Email/OTP | Resend API usage inside `supabase/functions/auth-otp/index.ts`. |
| Browser extension | Chrome extension manifest v3, content scripts, extension session bridge, marketplace host permissions. |
| Security libraries | DOMPurify, Turnstile integration, zod in some areas. |

## Apps

| App | Role | Port/script evidence | Notes |
| --- | --- | --- | --- |
| `apps/marketing` | Public marketing website | `apps/marketing/package.json` | Public routes and product pages. |
| `apps/web` | Main customer SaaS app | `apps/web/package.json` | Protected user dashboard, marketplace dashboards, Shopify integrations, billing, AI workflows. |
| `apps/admin` | Admin console | `apps/admin/package.json` | Protected by shared `ProtectedRoute` with `requireAdmin`. |
| `apps/extension` | Browser extension | `apps/extension/package.json`, `apps/extension/manifest.json` | Broad marketplace host permissions and content scripts. |

## Shared Packages

| Package | Role | Key evidence |
| --- | --- | --- |
| `packages/api-client` | Supabase client creation and shared API access | `packages/api-client/src/supabase/client.ts:6`, `packages/api-client/src/supabase/client.ts:21` |
| `packages/auth` | Auth context, route protection, login/signup/OTP, role loading | `packages/auth/src/hooks/useAuth.tsx:16`, `packages/auth/src/ProtectedRoute.tsx:24` |
| `packages/ui` | Shared UI components | Package folder inventory. |
| `packages/types` | Shared types | Package folder inventory. |
| `packages/utils` | Shared utilities | `packages/utils/src/whatsapp.ts:9` |

## Supabase Functions Inventory

Representative Edge Functions:

| Function | Role | Notes |
| --- | --- | --- |
| `auth-otp` | Signup, OTP resend, OTP verify, login-context validation | Uses service role client and custom OTP flow. |
| `create-checkout` | Stripe checkout session creation | Authenticates Supabase JWT in function body because JWT verification is disabled in config. |
| `stripe-webhook` | Stripe webhook processing | Uses webhook signature except development fallback. |
| `create-listing` | Create listing records from web or extension flows | Uses extension session/shared middleware and service role DB writes. |
| `sync-listing` | Extension/web listing sync | Supports Supabase JWT and extension API-style token. |
| `ebay-orders` | Authenticated eBay order list/delete and metrics | Uses service role for reads, aggregates, and deletes. |
| `orders-dashboard` | User-facing order dashboard | Uses anon/RLS query path. |
| `extension-*` | Extension auth, config, sessions, admin, sync, diagnostics | Implements custom browser-extension auth and workspace/device model. |
| `admin-*` | Admin operations | Adjust credits, support notes, AI settings, extension admin, and related admin tooling. |

## Database Inventory

Core database features found in migrations:

| Category | Evidence |
| --- | --- |
| Extensions | `supabase/migrations/20251226021050_remix_migration_from_pg_dump.sql:1` includes Postgres extensions such as `pg_graphql`, `pg_stat_statements`, `pgcrypto`, `supabase_vault`, and `uuid-ossp`. |
| Core users/auth tables | `profiles`, `user_roles`, `user_plans`, `plans`, `usage_logs`, `audit_logs`. |
| Marketplace tables | `listings`, `ebay_orders`, `order_enrichments`, `amazon_settings`, inventory/auto-order tables. |
| Extension workspace model | `workspaces`, `workspace_members`, `extension_devices`, `extension_sessions`, subscriptions, entitlements, activities, errors, jobs, and migrations. |
| Store design/Shopify tables | `store_designs`, `store_design_events`, `shopify_page_settings`, storage policies. |
| Security controls | RLS enabled across many tables, numerous policies, `SECURITY DEFINER` functions, and indexed user/workspace access paths. |

Migration scan summary:

- Tables found: about 52
- RLS enablement statements: about 53
- Policies found: about 76
- Indexes found: about 106
- `SECURITY DEFINER` functions found: about 31

## Deployment Inventory

| File | Purpose | Notes |
| --- | --- | --- |
| `vercel.json` | Root Vercel config | Builds `apps/web/dist`, rewrites SPA routes, no security headers found. |
| `apps/web/vercel.json` | Web SPA routing | Filesystem handler plus SPA fallback, no headers found. |
| `apps/admin/vercel.json` | Admin SPA routing | Filesystem handler plus SPA fallback, no headers found. |
| `apps/marketing/vercel.json` | Marketing SPA routing | Filesystem handler plus SPA fallback, no headers found. |
| `supabase/config.toml` | Supabase local/project function config | Many functions set `verify_jwt = false`; only `test-api-key` is explicitly true in the inspected section. |

Not found in repository:

- `.github` CI workflow directory
- Docker or Compose production runtime definitions
- Redis/cache infrastructure config
- Queue worker implementation beyond placeholder service directories and database job/activity tables
- Terraform/Pulumi/CloudFormation infrastructure-as-code
- Centralized monitoring configuration

Each missing item may exist outside the repository, but it is not verified from repository evidence.

## Sensitive Files And Public Configuration

The repository tracks a root `.env` file containing Vite public Supabase and Turnstile variables. Values are not reproduced in this audit.

Important note: Vite `VITE_*` values are usually browser-exposed by design and are not automatically secrets. The operational risk is that tracked `.env` files normalize committing environment material, and this repository also contains other hardcoded secret-bearing code paths documented in `02-security-audit.md`.

