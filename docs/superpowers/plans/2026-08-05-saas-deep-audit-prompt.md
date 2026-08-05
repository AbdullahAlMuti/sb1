# Multi-Agent Deep SaaS Audit Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the production-ready Multi-Agent Deep SaaS Audit Master Prompt for SellerSuit, fully aligned with the eBay-only product scope, credit deduction gate rules, extension scraper mechanics, Deno Edge Function security, and React SPA dashboard architecture.

**Architecture:** A comprehensive, multi-persona single prompt that orchestrates 5 specialized subagent personas to conduct an exhaustive 360-degree audit of the SellerSuit monorepo.

**Tech Stack:** Markdown, System Prompting, Node.js (`npm run check:local`), Chrome Extension Manifest V3, Deno Edge Functions, Supabase PostgreSQL RLS.

## Global Constraints

- Scope: eBay-Only Active SaaS (Shopify disabled & gated).
- Billing Rule: Listing creation = exactly -1 credit via `trg_enforce_listing_credit_gate` trigger.
- Source of Truth: `apps/extension/` for extension edits.
- Title Limit: eBay 80-character maximum (`_enforceEbayTitle()`).

---

### Task 1: Create the Multi-Agent Deep SaaS Audit Master Prompt File

**Files:**
- Create: `docs/superpowers/prompts/saas_deep_audit_master_prompt.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-05-saas-deep-audit-prompt-design.md`
- Produces: Master Prompt Markdown Document

- [ ] **Step 1: Write the Multi-Agent Master Prompt File**

Write the complete self-contained prompt to `docs/superpowers/prompts/saas_deep_audit_master_prompt.md`.

- [ ] **Step 2: Verify file exists and is non-empty**

Run: `ls -la docs/superpowers/prompts/saas_deep_audit_master_prompt.md`

- [ ] **Step 3: Commit prompt document**

```bash
git add docs/superpowers/prompts/saas_deep_audit_master_prompt.md docs/superpowers/plans/2026-08-05-saas-deep-audit-prompt.md
git commit -m "docs: add multi-agent deep saas audit master prompt and plan"
```

---

### Task 2: Validate Monorepo Hygiene & Pre-Release Script Gate

**Files:**
- Test: Workspace root (`package.json`)

- [ ] **Step 1: Run pre-release gate check**

Run: `npm run check:local`
Expected: Zero type errors, clean security scan, passing lint, successful build across marketing, web, and admin apps.

- [ ] **Step 2: Verify Chrome extension test suite**

Run: `cd apps/extension && npm test`
Expected: All Node built-in unit tests pass clean.
