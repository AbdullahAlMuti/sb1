# 🚀 Future Work & Roadmap

This document outlines the planned improvements, technical debt, and feature expansions for the **SellerSuit** project (SaaS Dashboard + Chrome Extension).

---

## 🏗️ 1. Architecture & Refactoring (High Priority)
The Chrome Extension's `background.js` has grown significantly (>2300 lines) and handles too many responsibilities.

- **Modularize `background.js`**:
  - Split into dedicated service workers/modules:
    - `services/auth-service.js` (Auth checks, token management)
    - `services/ebay-sync.js` (CSV parsing, fetching, processing)
    - `services/ai-service.js` (Image processing, title generation)
  - **Why**: Improves maintainability and reduces "Extension context invalidated" errors during updates.

- **Standardize Message Handling**:
  - Ensure ALL content scripts use the pattern in `common/message-handler.js`.
  - Remove legacy `chrome.runtime.onMessage` listeners that might conflict.

## 🔄 2. eBay Integration Enhancements
- **Two-Way Sync**:
  - *Current*: Read-only (eBay -> Dashboard).
  - *Future*: Write-back (Dashboard -> eBay). Allow users to update Tracking Numbers or Mark as Shipped from the Dashboard.
- **Inventory Sync**:
  - Sync stock levels between Supabase and eBay to prevent overselling.
- **Error Handling**:
  - Implement a "Retry Queue" UI in the Dashboard to show failed syncs and allow manual retry (currently logs to console).

## 🤖 3. AI Features
- **Background Removal**:
  - The current `AI_REMOVE_BG` handler in `background.js` should always point to the production web app endpoint (https://sellersuit.com) or a secure server-side wrapper.
  - **Action**: Implement a robust Edge Function wrapper for Replicate/OpenAI to hide API keys and handle rate limits.
- **Listing Optimization**:
  - Enhance `GENERATE_TITLE` to allow "Template Management" from the Dashboard (e.g., set Tone, Forbidden Words).

## 🔒 4. Authentication & Security
- **Token Rotation**:
  - Currently, we rely on `auth_sync.js` to push new tokens when `localStorage` updates.
  - **Improvement**: Implement proactive token refresh in the extension using the `refresh_token` if the web app isn't open.

## 🧪 5. Testing & Quality Assurance
- **Automated Testing**:
  - Add E2E tests for the Extension using **Puppeteer** or **Playwright**.
  - Test critical flows: Login Sync -> eBay CSV Fetch -> Database Insert.
- **Mocking**:
  - Create a "Mock eBay" mode to test the parser without needing a real logged-in eBay session.

## 📊 6. User Experience (UX)
- **Sync Status History**:
  - Show a log of the last 10 syncs in the Dashboard (Time, Orders Count, Status).
- **Onboarding**:
  - Create an interactive "Walkthrough" for new users installing the extension for the first time.

---

## 📝 Known Issues / Technical Debt
- **Date Parsing**: The custom CSV date parser in `sync-ebay-orders` is complex. Consider using a library like `date-fns` or `luxon` if eBay formats vary further.
- **Hardcoded Config**: Some URLs (like the Google Sheet default) are hardcoded in `background.js`. Move completely to `config.js`.
