# About Page Editorial Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the placeholder `/about` page into a world-class editorial company showcase mirroring the user's reference layout, featuring a 5-cell Bento grid, mission & metrics, core values, founder letter, team grid with generated photorealistic dummy portraits, testimonials, global office cards, and full mobile responsiveness.

**Architecture:** Centralized configuration in `aboutConfig.ts` decouples data from UI components. Modular section components in `apps/marketing/src/components/about/` assemble into `apps/marketing/src/pages/About.tsx`, wrapped by global `Navbar`, `CTASection`, and `Footer`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Playwright for visual verification.

## Global Constraints

- Scope: strictly `apps/marketing`. Do not touch backend or Chrome extension.
- Template Decoupling: All copy, names, designations, and image paths must reside in `aboutConfig.ts` so the user can easily swap real photos and designations later.
- Images: Photorealistic dummy assets in `apps/marketing/public/images/about/`.
- Page composition: `<Navbar />`, `<main style={{ overflowX: "hidden" }}>`, section components, `<CTASection />`, and `<Footer />`.

---

### Task 1: Generate Photorealistic Dummy Assets

**Files:**
- Create: `apps/marketing/public/images/about/bento-portrait.jpg`
- Create: `apps/marketing/public/images/about/bento-collab.jpg`
- Create: `apps/marketing/public/images/about/bento-workspace.jpg`
- Create: `apps/marketing/public/images/about/founder.jpg`
- Create: `apps/marketing/public/images/about/team-1.jpg` through `team-6.jpg`
- Create: `apps/marketing/public/images/about/office-usa.jpg`
- Create: `apps/marketing/public/images/about/office-bd.jpg`

- [ ] **Step 1: Create directory `apps/marketing/public/images/about`**
- [ ] **Step 2: Generate all photorealistic dummy assets via AI image generation / asset generation script**
- [ ] **Step 3: Verify all image files exist and are valid non-empty images**
- [ ] **Step 4: Commit assets to git**
```bash
git add apps/marketing/public/images/about/
git commit -m "feat(marketing): add photorealistic dummy assets for about page"
```

---

### Task 2: Centralized About Configuration & Types

**Files:**
- Create: `apps/marketing/src/config/aboutConfig.ts`

**Interfaces:**
- Produces: `AboutConfig`, `TeamMember`, `CoreValue`, `ImpactMetric`, `OfficeLocation`, `TestimonialItem`

- [ ] **Step 1: Write `aboutConfig.ts` with full typed schema and placeholder template data**
- [ ] **Step 2: Run typecheck to verify 0 errors**
```bash
npm --workspace @sellersuit/marketing run typecheck
```
- [ ] **Step 3: Commit**
```bash
git add apps/marketing/src/config/aboutConfig.ts
git commit -m "feat(marketing): add centralized aboutConfig data and types"
```

---

### Task 3: Build About Modular Sub-Components

**Files:**
- Create: `apps/marketing/src/components/about/AboutHeroBento.tsx`
- Create: `apps/marketing/src/components/about/AboutMissionMetrics.tsx`
- Create: `apps/marketing/src/components/about/AboutCoreValues.tsx`
- Create: `apps/marketing/src/components/about/AboutFounderWord.tsx`
- Create: `apps/marketing/src/components/about/AboutTeamGrid.tsx`
- Create: `apps/marketing/src/components/about/AboutTestimonials.tsx`
- Create: `apps/marketing/src/components/about/AboutOffices.tsx`

- [ ] **Step 1: Create `AboutHeroBento.tsx` (Headline + Subtitle + 5-cell Bento photo/stat grid)**
- [ ] **Step 2: Create `AboutMissionMetrics.tsx` (Two-column narrative + 4 metric stat cards)**
- [ ] **Step 3: Create `AboutCoreValues.tsx` (4 values with icons, titles, and descriptions)**
- [ ] **Step 4: Create `AboutFounderWord.tsx` (Founder quote, narrative letter, signature, and workspace photo)**
- [ ] **Step 5: Create `AboutTeamGrid.tsx` (6-card team gallery with headshots, names, designations, and social icons)**
- [ ] **Step 6: Create `AboutTestimonials.tsx` (3x3 grid of client quote cards)**
- [ ] **Step 7: Create `AboutOffices.tsx` (Florida USA & Dhaka Bangladesh office cards with city photos)**
- [ ] **Step 8: Run typecheck**
```bash
npm --workspace @sellersuit/marketing run typecheck
```
- [ ] **Step 9: Commit**
```bash
git add apps/marketing/src/components/about/
git commit -m "feat(marketing): build modular about page sub-components"
```

---

### Task 4: Assemble `About.tsx` & Route Integration

**Files:**
- Modify: `apps/marketing/src/pages/About.tsx`

- [ ] **Step 1: Rewrite `About.tsx` to compose all 7 modular components with `Navbar`, `CTASection`, and `Footer`**
- [ ] **Step 2: Add SEO metadata with `useSeo` hook**
- [ ] **Step 3: Run typecheck**
```bash
npm --workspace @sellersuit/marketing run typecheck
```
- [ ] **Step 4: Commit**
```bash
git add apps/marketing/src/pages/About.tsx
git commit -m "feat(marketing): assemble About page editorial layout"
```

---

### Task 5: End-to-End Verification & Production Build

**Files:**
- Create: `scratch/verify_about_page.cjs`

- [ ] **Step 1: Run Playwright test script on Desktop (1440px) and Mobile (390px)**
- [ ] **Step 2: Capture screenshots of all sections**
- [ ] **Step 3: Run production build**
```bash
npm --workspace @sellersuit/marketing run build
```
- [ ] **Step 4: Update `walkthrough.md`**
