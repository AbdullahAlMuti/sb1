# About Us Editorial Showcase Page Design Specification

- **Date:** 2026-09-17
- **Target App:** `apps/marketing`
- **Route:** `/about`
- **Design Inspiration:** User-uploaded template layout (Indigo About Us)

---

## 1. Executive Summary & Goals

Transform the existing placeholder `/about` page into a world-class, high-converting editorial company showcase. The page tells SellerSuit's story, vision, core values, team, founder's message, customer testimonials, and global offices with modern Bento grids, typography, and photorealistic dummy assets.

All team members, copy, metrics, and office locations are isolated into a centralized configuration (`aboutConfig.ts`) so the user can easily swap in real photos and designations later without touching any UI code.

---

## 2. Scope & Constraints

- **Scope Boundary**: Strictly `apps/marketing`. Core SaaS backend, database, and Chrome extension are untouched.
- **Dummy Asset Policy**: All dummy images are generated as photorealistic, web-optimized JPEG assets and placed into `apps/marketing/public/images/about/`.
- **Navigation & Brand Consistency**: Uses existing `Navbar` and `Footer` components.
- **Responsiveness**: Fully responsive from 1440px desktop down to 390px mobile viewports.

---

## 3. Page Structure & Components

The `About.tsx` page will compose 8 dedicated, modular components:

### 3.1 Hero & Bento Grid (`AboutHeroBento.tsx`)
- **Headline**: "Where technology meets opportunity"
- **Subtitle**: "Building next-generation automation tools for modern marketplace businesses."
- **Bento Visual Grid**:
  1. Left tall card: Portrait of engineer in studio setting (`bento-portrait.jpg`, 3:4 aspect ratio).
  2. Center top card: Vibrant primary stat card (`90% YoY Efficiency Gain`).
  3. Center bottom card: Group team whiteboard collaboration (`bento-collab.jpg`, 4:3 aspect ratio).
  4. Right top card: Developer working on laptop at cafe/workspace (`bento-workspace.jpg`, 4:3 aspect ratio).
  5. Right bottom card: High-contrast dark stat card (`50% Cost Reduction`).

### 3.2 Mission Narrative & Metrics (`AboutMissionMetrics.tsx`)
- Light contrast background wrapper.
- **Two-Column Split**:
  - Left: Bold headline "Making software better for everyone".
  - Right: 2 paragraphs of inspiring company vision narrative.
- **4 Key Metric Callouts**:
  - `90M+` Registered Operations / Listings Synced
  - `95%` Customer Retention Rate
  - `77%` Workflow Speed Increase
  - `5k+` Active Marketplace Sellers

### 3.3 Core Values (`AboutCoreValues.tsx`)
- Section heading: "Our core values" with subtitle.
- **4 Values**:
  1. *Customer Obsessed*: We build directly for the day-to-day workflow of active sellers.
  2. *Radical Automation*: Eliminating manual repetitive tasks with resilient AI and code.
  3. *Engineering Precision*: Zero-tolerance for data drift, broken feeds, or downtime.
  4. *Transparent Integrity*: Clear pricing, honest capabilities, and direct customer trust.

### 3.4 Partner & Platform Marquee (`AboutPartnersMarquee.tsx`)
- Section heading: "Backed by the best" with subtitle.
- Scrolling logo marquee of major ecosystem platforms (Amazon, Walmart, eBay, Stripe, Shopify).

### 3.5 Founder Message (`AboutFounderWord.tsx`)
- Two-column layout:
  - Left: "A Word from the Founder", 3 paragraphs of founder vision, signature mark, founder name and title (dummy customizable template).
  - Right: Founder portrait working at modern office desk (`founder.jpg`, rounded-3xl with subtle drop shadow).

### 3.6 Meet the Team (`AboutTeamGrid.tsx`)
- Section heading: "Meet the team" with subtitle.
- Responsive grid (6-8 cards) displaying dummy team members:
  - Square/portrait photo (`team-1.jpg` through `team-6.jpg`)
  - Full Name
  - Designation / Title (e.g. Lead Architect, Head of Product, Senior AI Engineer)
  - Social icons (LinkedIn, GitHub, Twitter)

### 3.7 Wall of Love / Testimonials (`AboutTestimonials.tsx`)
- Section heading: "Trusted by the best in your industry"
- 3x3 grid of testimonial quote cards with client avatar, author name, company role, and quote.

### 3.8 Global Offices (`AboutOffices.tsx`)
- Section heading: "Our offices are all across the world"
- 2 location cards matching our official company offices:
  1. **Deltona, Florida, USA** (`office-usa.jpg`, address: 491 Fort Smith Blvd, Deltona, FL 32738)
  2. **Dhaka, Bangladesh** (`office-bd.jpg`, address: 195, Fakirapool, Motijheel, Dhaka-1000)

### 3.9 Conversion CTA (`CTASection.tsx`)
- Standard global CTA banner with primary trial button and demo preview.

---

## 4. Configuration Schema (`apps/marketing/src/config/aboutConfig.ts`)

All copy and data will be typed and exported from `aboutConfig.ts`:
- `aboutHeroConfig`
- `aboutMissionConfig`
- `aboutCoreValues`
- `aboutFounderConfig`
- `aboutTeamMembers`
- `aboutTestimonials`
- `aboutOffices`

---

## 5. Visual Verification Plan

1. **Playwright Visual Verification**:
   - Automated screenshot capture of full `/about` page on Desktop (1440px).
   - Mobile viewport verification on 390px (iPhone 14/15 size).
2. **Quality Gates**:
   - `npm --workspace @sellersuit/marketing run typecheck` (0 errors).
   - `npm --workspace @sellersuit/marketing run build` (0 errors).
