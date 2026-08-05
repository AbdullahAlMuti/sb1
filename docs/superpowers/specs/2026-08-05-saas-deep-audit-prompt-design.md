# Design Document: SellerSuit Multi-Agent Deep SaaS Audit Framework

**Date**: 2026-08-05  
**Target Repository**: SellerSuit Monorepo (`d:\eBay Software\2026sellersuit\sb1`)  
**Scope Boundary**: eBay-Only Active SaaS (Shopify disabled/future scope)

---

## 1. Executive Summary

This design document outlines the structure of the **SellerSuit Multi-Agent Deep SaaS Audit Master Prompt**. The prompt orchestrates specialized agent personas (Security & Auth Auditor, Database & Credit Gate Auditor, Extension Scraper & Payload Auditor, Edge Functions & Billing Auditor, and Frontend & Scope Gate Auditor) to perform an exhaustive, non-destructive audit of the entire codebase.

---

## 2. Architecture & Monorepo Overview

SellerSuit comprises:
- **`apps/web`**: React/TypeScript SPA (Marketing site + eBay dashboard)
- **`apps/extension`**: Manifest V3 Chrome extension (Vanilla JS + Vite adapters for Amazon/Walmart)
- **`apps/admin`**: Admin panel
- **`packages/*`**: Shared packages (`@repo/auth`, `@repo/api-client`, `@repo/ui`, `@repo/types`, etc.)
- **`supabase/functions`**: ~50 Deno Edge Functions
- **`supabase/migrations`**: PostgreSQL database migrations

---

## 3. Specialized Multi-Agent Roles & Focus Areas

### Agent 1: Security, Auth Bridge & Scope Gate Auditor
- **Shopify Leak Inspection**: Ensures 0% Shopify user-facing leaks (navigation, dashboard, billing, marketplace cards).
- **Auth Token Bridge**: Audits token transfer from web `postMessage` → `auth_sync.js` → `chrome.storage.local` → `auth-status` Edge Function.
- **JWT & RLS Security**: Validates Supabase RLS policies and Deno Edge Function JWT verification.

### Agent 2: Database Schema, RPC & Credit Engine Auditor
- **Credit Deduction Gate**: Verifies `trg_enforce_listing_credit_gate` trigger and `create_listing_with_variations` RPC.
- **Data Integrity**: Audits transaction concurrency, negative balance prevention, credit usage logging (`credit_transactions` table), and index optimization.

### Agent 3: Chrome Extension, Scrapers & eBay Payload Auditor
- **Supplier Scrapers**: Audits Amazon (V1 click vs V2 data) and Walmart adapters.
- **CAPTCHA & Error Handling**: Verifies CAPTCHA errors propagate strictly without silent infinite loops or swallowed exceptions.
- **eBay Rules**: Checks `_enforceEbayTitle()` (80-char limit) and `UniversalProduct` normalization contract.
- **Build Integrity**: Confirms source edits in `apps/extension/` and build sync.

### Agent 4: Edge Functions, Queue Worker & Billing Auditor
- **Stripe & Subscriptions**: Audits `create-checkout`, `customer-portal`, `stripe-webhook`, and `check-subscription-v2`.
- **Backend Reliability**: Checks error handling, CORS headers, Deno timeouts, and `queue-worker` retry/dead-letter logic.

### Agent 5: Frontend & Admin Component Auditor
- **React SPA Hygiene**: Inspects `apps/web` routing (`App.tsx`, `EbayRoutes`), protected route guards, and error boundaries.
- **Admin App Isolation**: Verifies `apps/admin` separation and `vercel.json` rewrite configurations.

---

## 4. Master Prompt Output Specification

The generated Master Prompt will be structured as a self-contained, copy-pasteable prompt block ready for execution by AI assistants or team audit sessions.
