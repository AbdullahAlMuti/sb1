
## Compliance Review Summary (Chrome Web Store + Website)

### Goal
Review the **Chrome extension + website** for Chrome Web Store compliance focusing on **manifest, permissions, assets, policies, metadata, and UI readiness**. No business logic changes.

---

## 1) Current Status Checklist (✅/⚠️/❌)

### 1.1 Manifest basics
| Item | Status | Evidence / Notes |
|---|---:|---|
| `manifest_version: 3` | ✅ | `chrome_extension/manifest.json` line 2 |
| `name` present | ✅ | Currently `"eBay Snipping Tool"` |
| `version` present | ✅ | `"1.3.1"` |
| `description` present | ✅ | Present, but should be aligned with branding and actual features |
| `action.default_popup` | ✅ | `popup.html` |
| `icons` 16/48/128 | ✅ | `icons/icon16.png`, `icon48.png`, `icon128.png` exist |

### 1.2 Required Web Store metadata (not in manifest)
| Item | Status | Notes |
|---|---:|---|
| Privacy Policy URL in **Web Store listing** | ⚠️ | Not in manifest (that’s okay). Must be set in the Chrome Developer Dashboard listing fields. You already host `/privacy-policy`. |
| Support email | ⚠️ | Must be provided in Web Store listing (and ideally also on site footer/support page). |
| Support / homepage URL | ✅ | `homepage_url: https://sellersuit.com` in manifest |

### 1.3 Host permissions & minimal-permissions policy
| Item | Status | Notes |
|---|---:|---|
| No localhost / lovable hosts in manifest | ✅ | Manifest now only includes production domains |
| Host permissions appear minimal | ❌/⚠️ | Manifest includes several domains that appear unused or mismatched: `gemini.google.com`, `api.replicate.com`, `cdn.jsdelivr.net`, `www.dailyfindz.com` |
| Domain required by code but missing in manifest | ⚠️ | Code fetches `https://generativelanguage.googleapis.com/...` (Gemini API) but manifest currently does not include `https://generativelanguage.googleapis.com/*`. This can cause runtime failures and/or review confusion. |

### 1.4 Remote code / external resources
| Item | Status | Notes |
|---|---:|---|
| No remote JS libraries loaded | ✅ | Good for MV3 “no remote code” policy |
| Remote CSS/Font usage | ⚠️ | `chrome_extension/ui/panel.html` loads Google Fonts from `fonts.googleapis.com`. This is sometimes accepted, but it can trigger “remote code / remote resources” scrutiny. Safer for Web Store review: remove remote font dependency or bundle locally. (UI-only change.) |

### 1.5 Policy pages on HTTPS
| Item | Status | Notes |
|---|---:|---|
| Privacy Policy page exists | ✅ | `src/pages/PrivacyPolicy.tsx` with extension-specific sections |
| Terms of Service exists | ✅ | `src/pages/TermsOfService.tsx` |
| HTTPS hosting | ✅ | `https://sellersuit.com/*` |
| Store-friendly canonical routes | ✅ | `/privacy-policy` and `/terms-of-service` are routed in `src/App.tsx` |

### 1.6 Branding consistency (store clarity)
| Item | Status | Notes |
|---|---:|---|
| Extension branding matches product | ❌ | Manifest name/title say “eBay Snipping Tool” while UI and site brand are “SellerSuit”. This can reduce trust and increase reviewer questions. You chose “Align to SellerSuit”. |

---

## 2) Issues Found + Why They Matter (Compliance Impact)

### Issue A — Unused / incorrect host permissions (High priority)
**Found in manifest `host_permissions`:**
- `https://gemini.google.com/*` (used only as a link target; not required as host permission)
- `https://api.replicate.com/*` (not used directly; remove to satisfy minimal-permissions)
- `https://cdn.jsdelivr.net/*` (not used in extension runtime; remove)
- `https://www.dailyfindz.com/*` (not used; remove)

**Why this matters**
Chrome Web Store reviewers strongly enforce **least privilege**. Unused host permissions are one of the most common rejection reasons.

**Also:** The extension background script performs a fetch to:
- `https://generativelanguage.googleapis.com/...`
…but that host is not included in `host_permissions`, which can cause:
- runtime failures for that feature
- reviewer confusion (“why request gemini.google.com but call generativelanguage.googleapis.com?”)

---

### Issue B — Remote Google Fonts reference in extension UI (Medium priority)
- `chrome_extension/ui/panel.html` loads:
  - `https://fonts.googleapis.com/css2?family=Inter...`

**Why this matters**
MV3 disallows remote code; while fonts/CSS are not JS, reviewers sometimes interpret remote stylesheet loads as problematic. Safest approach is to avoid external loads in extension pages and use:
- system font stack, or
- bundled font files inside the extension.

This is UI-only and does not change logic.

---

### Issue C — Branding mismatch (Medium priority)
Manifest shows:
- Name: “eBay Snipping Tool”
- Action title: “eBay Snipping Tool”
Popup UI shows:
- “SellerSuit Sync”
Website brand:
- SellerSuit

**Why this matters**
Not a strict technical policy violation, but a frequent reason for “needs more information” or trust/clarity issues. You requested to align branding.

---

### Issue D — Store listing requirements not represented in repo (Expected, but needs checklist)
Screenshots, promotional tiles, privacy Q&A answers, and “data handling” disclosures are all required in the Chrome Developer Dashboard, not the codebase. We need a concrete checklist and recommended wording.

---

## 3) Step-by-Step Fix Plan (No business logic changes)

### Phase 1 (High Priority): Manifest permission cleanup + correctness
1) **Remove unused host permissions** from `chrome_extension/manifest.json`:
   - Remove:
     - `https://www.dailyfindz.com/*`
     - `https://api.replicate.com/*`
     - `https://cdn.jsdelivr.net/*`
     - `https://gemini.google.com/*`
   - Rationale: least privilege for store approval.

2) **Add required host permission** (matches actual network calls):
   - Add:
     - `https://generativelanguage.googleapis.com/*`
   - Rationale: background script fetches this domain; host permission should match.

**Note on your “Gemini feature = Decide later”**
- This plan does not change any logic. It only makes the manifest consistent with what the code already does.
- If you later decide to remove that feature entirely, that would require logic changes (out of scope here).

---

### Phase 2 (Medium Priority): Remove remote font dependency (UI-only)
Option A (lowest risk, simplest):
- Replace Inter Google Fonts with a system font stack in `ui/panel.html` and `ui/panel.css` (no external requests).

Option B (best branding fidelity, slightly more work but still UI-only):
- Add Inter font files to `chrome_extension/assets/fonts/` and reference via `@font-face` in `panel.css`.
- Remove the `fonts.googleapis.com` `<link>` from `panel.html`.

This improves compliance posture and reduces reviewer scrutiny.

---

### Phase 3 (Medium Priority): Align extension branding to SellerSuit (metadata/UI text only)
1) Update `chrome_extension/manifest.json`:
   - `name`: change to “SellerSuit” or “SellerSuit for eBay”
   - `action.default_title`: change to “SellerSuit”
   - `description`: rewrite to match actual features and brand voice

2) Update extension UI titles where needed (text only):
   - Popup already says “SellerSuit Sync” (good).
   - Panel titles already say “SellerSuit Panel” (good).
   - Ensure consistent naming across store listing, website, and extension UI.

No logic changes required.

---

### Phase 4: Web Store listing compliance pack (documentation + assets checklist)
Prepare the required items (outside code):
1) **Screenshots** (mandatory)
   - Popup (Connected)
   - Popup (Not Connected)
   - Amazon page with injected panel
   - Walmart page with injected panel
   - eBay listing flow automation screen
   - (Optional) Dashboard extension connect page on sellersuit.com

2) **Store listing text**
   - Short description (1–2 lines)
   - Detailed description (features, supported sites, how it works)
   - Permission justifications (see below)

3) **Privacy practices questionnaire answers**
   - Disclose: authentication token in Chrome storage, site content processing on supported domains, optional Google Sheets sync.

4) **Policy URLs**
   - Privacy Policy: `https://sellersuit.com/privacy-policy`
   - Terms: `https://sellersuit.com/terms-of-service`
   - Ensure both pages load without login.

---

## 4) Permissions Justification (Copy-ready for Web Store listing)
Use concise, reviewer-friendly wording:

### Permissions
- **storage**: Saves extension settings (sync interval/lookback) and authentication token required to connect to SellerSuit services.
- **tabs**: Opens SellerSuit dashboard/login pages and coordinates login flow.
- **scripting**: Injects the SellerSuit panel UI into supported pages (Amazon/Walmart/eBay) to assist listing workflows.
- **downloads**: Allows users to download exported images/files they explicitly request.

### Host permissions
- **Amazon/Walmart/eBay**: Required to run the extension UI and extract product/listing data on those sites when the user activates the tool.
- **sellersuit.com**: Required for auth sync and to open dashboard pages.
- **Supabase domain**: Required to call SellerSuit backend edge functions for authentication/status and app features.
- **Google APIs (if used by existing code)**: Required only for the specific API endpoints actually called (ensure it matches `generativelanguage.googleapis.com` if that feature is present).

---

## 5) Publishing Guide (Step-by-step, Web Store ready)

### A) Website readiness (already live, verify)
1) Confirm HTTPS: `https://sellersuit.com`
2) Confirm SPA routing works on refresh:
   - `/dashboard/listings` refresh must not 404
3) Confirm legal pages are public:
   - `/privacy-policy`
   - `/terms-of-service`

### B) Final extension QA (before zip)
1) Load unpacked extension (production manifest)
2) Log in to SellerSuit web app
3) Open extension popup:
   - Connected state shows correctly
4) On Amazon/Walmart:
   - Panel injects
5) On eBay listing pages:
   - Listing helper scripts run
6) DevTools Network:
   - Confirm no calls to `localhost` or lovable staging domains
   - Confirm any external API calls match manifest host permissions

### C) Packaging
1) Zip the **contents** of `chrome_extension/` so `manifest.json` is at the zip root.
2) Ensure icons are present (16/48/128).
3) Bump `version` for each upload.

### D) Chrome Web Store submission checklist
- Upload zip
- Add screenshots
- Provide support email + support URL
- Provide Privacy Policy URL
- Fill privacy practices questionnaire accurately
- Submit and respond to any reviewer notes with:
  - permission justification
  - policy clarifications
  - proof that permissions are limited to required domains

---

## 6) “Compliance Fix Log” (what we’ll remember for next steps)
1) Tighten manifest host permissions:
   - Remove: dailyfindz.com, api.replicate.com, cdn.jsdelivr.net, gemini.google.com
   - Add: generativelanguage.googleapis.com (matches code)
2) Remove remote Google Fonts dependency from extension panel UI (prefer local/system fonts)
3) Align manifest branding to SellerSuit (name/title/description)
4) Ensure Web Store listing includes:
   - privacy policy URL
   - support email
   - accurate permissions justification
   - required screenshots

---

## 7) Implementation Notes (what is safe to auto-fix without touching logic)
Safe automatic fixes (metadata/UI only):
- Manifest host permissions cleanup/additions
- Manifest name/title/description branding updates
- Removing remote font link / switching to bundled fonts or system fonts
- Adding/adjusting documentation files/checklists

Not changing:
- Any scraping logic, sync logic, API request payloads, auth flows, or conditions/loops.

