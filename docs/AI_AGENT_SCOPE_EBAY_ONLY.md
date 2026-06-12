# AI AGENT SCOPE — eBay-Only (READ FIRST)

> **Status:** ACTIVE PRODUCT SCOPE = **eBay only**.
> **Shopify:** disabled, hidden, ignored, **future scope only**.
> **Last reaffirmed:** 2026-06-12 by the repository owner.

This file is the permanent source of truth for *what is in scope* in this
repository. Any AI agent (Claude Code or otherwise) MUST read and obey this file
before planning, analyzing, reporting, or writing code. It overrides any default
assumption that Shopify is an active feature.

---

## 1. The one rule

**This SaaS is currently eBay-only. Shopify is totally disabled.**

Shopify code exists in the repository, but it is **not part of the current
product**. Treat it as dormant/legacy/future scope — never as an active feature.

This remains true until the repository owner explicitly says:

> **"Enable Shopify now."**

Until that sentence is given, every ambiguous instruction is interpreted as
**eBay-only**.

---

## 2. What IS in scope (the active product)

Work freely on all of the following — this is the real product:

- eBay listing creation (single + variation listings)
- eBay SKU logic
- eBay pricing logic
- eBay images
- eBay item specifics
- eBay variation handling
- eBay order management / order sync (where already implemented)
- The Chrome extension (Manifest V3)
- Supplier product import (Amazon / Walmart / supplier → normalized product → eBay)
- AI title / description / image generation **for eBay listings**
- User dashboard — **the eBay dashboard only**
- Admin panel control for eBay-related SaaS workflow
- Billing / credits / limits / plans for eBay-related features
- Backend / API / Edge Functions for the eBay-only workflow
- Database / storage / queue / worker for the eBay-only workflow
- Security, monitoring, deployment for the above

## 3. What is NOT in scope (do not work on)

Do **not** plan, build, analyze, recommend, or "improve" any of these:

- Shopify workflow of any kind
- Shopify product sync
- Shopify app connection / OAuth
- Shopify storefront / store designs
- Shopify orders
- Shopify publishing
- Shopify backend / database / storage / scaling plans
- Shopify roadmap items
- Shopify product-research / spy tools / ad library / winning products / copy studio
  (these all live under the disabled Shopify area)

---

## 4. Rules for AI agents

### Reports, diagrams, and recommendations
- When producing **any** report, architecture/workflow diagram, database plan,
  backend plan, storage plan, queue/worker plan, scaling plan, or roadmap:
  **include only eBay-related workflow.**
- The **only** allowed mention of Shopify is this single note:
  > *Shopify exists in the repository but is intentionally disabled and is future
  > scope only.*
- Do not add Shopify to architecture, ERDs, sequence diagrams, or roadmaps.

### User-facing surfaces
- Shopify must **not** appear in the user-facing dashboard, sidebar, navigation,
  marketplace cards, onboarding/registration steps, settings, integrations,
  dashboard widgets, feature cards, or visible billing/plan feature lists.
- The current product must behave like an **eBay-only** SaaS to end users.
- Shopify routes/pages should be **hidden or disabled** from normal user access,
  not deleted.

### Code handling
- **Never delete Shopify code.** Keep it recoverable.
- **Never drop Shopify database tables.**
- **Never remove or edit Shopify migrations** to delete them.
- Do not rewrite, refactor, or improve Shopify features.
- Prefer a **feature-flag / config gate** over deletion (see section 6).
- Only touch Shopify code if it **breaks the active eBay build or runtime** — and
  then only the minimum needed to keep eBay working.

### Ambiguity
- Any ambiguous task defaults to **eBay-only**.
- If a request seems to ask for Shopify work, pause and confirm with the owner
  rather than assuming Shopify is active.

---

## 5. Known Shopify locations (do not treat as active)

These exist today and are intentionally dormant. This list is informational so
agents recognize Shopify code and leave it alone:

- `apps/web/src/pages/integrations/shopify/**` — Shopify dashboard pages
- `apps/web/src/components/shopify/**` — Shopify UI shell/sidebar/header
- `apps/web/src/hooks/shopify/**` — Shopify hooks
- `apps/admin/src/pages/shopify-app/**`, `apps/admin/src/pages/AdminShopifyApp.tsx`
- Shopify routes in `apps/web/src/App.tsx` (`/dashboard/shopify`, `/integrations/shopify`)
- `goal === 'shopify' | 'both'` branches in `Register.tsx`, `Auth.tsx`,
  `packages/auth/src/ProtectedRoute.tsx`, `packages/config/src/navigation.ts`
- `store_designs` tables/migrations in `supabase/migrations/**`
- Shopify mentions in marketing components (`HeroSection`, `WorkflowSection`)

> Treat every item above as **disabled / future scope**, regardless of whether a
> feature flag has been wired in yet.

---

## 6. Preferred hiding mechanism (feature flag, not deletion)

When asked to hide Shopify from users, gate it — do not delete it.

```ts
export const marketplaceScope = {
  ebay:    { enabled: true,  active: true,  currentScope: true },
  shopify: { enabled: false, active: false, currentScope: false, futureScope: true },
} as const;
```

```env
EBAY_ENABLED=true
SHOPIFY_ENABLED=false
```

Re-enabling Shopify in the future should be a flag flip + route re-mount, not a
code-recovery exercise.

---

## 7. Confirmation

**Current product scope = eBay only. Shopify = disabled / future scope.**
This holds until the owner explicitly says *"Enable Shopify now."*
