# SellerSuit — Privacy Policy

_Last updated: 2026-07-06_

SellerSuit ("the extension", "we", "us") is a productivity tool that helps eBay
sellers create listings from supported supplier pages (Amazon, Walmart,
AliExpress) and manage their eBay orders. This policy explains exactly what data
the extension handles, why, where it goes, and how you control it.

**Single purpose:** streamline eBay listing creation and order management for the
signed-in user's own accounts. We do **not** sell user data, we do **not** serve
ads, and we do **not** use user data for any purpose unrelated to the features
you invoke.

---

## 1. Data we handle

### a) Account / authentication data
- **What:** your SellerSuit account email, user ID, plan, credit balance, and a
  Supabase session token (JWT).
- **Source:** copied from the SellerSuit web dashboard (`sellersuit.com`) after
  you log in there.
- **Where it goes:** stored locally in `chrome.storage.local` and sent only to
  the SellerSuit backend (`https://ojxzssooylmydystjvdo.supabase.co`) to verify
  your session and gate paid features.
- **Why:** to authenticate you and enforce your subscription/credits.

### b) Product data you choose to import
- **What:** product title, description, images, price, and attributes from the
  supplier page you are actively viewing when you click "import/list".
- **Where it goes:** the SellerSuit backend (to build the eBay listing) and,
  when you complete a listing, to **eBay** via your own eBay session.
- **Why:** to create the eBay listing you requested. Collected only on the pages
  and moments you act on — there is no background browsing collection.

### c) eBay order data (only if you use order sync)
- **What:** your eBay orders, including **buyer name, shipping address, item,
  and order/transaction details** shown in your eBay Seller Hub.
- **Source:** read from eBay pages using **your own** logged-in eBay session,
  only when you trigger a sync.
- **Where it goes:** the SellerSuit backend, so your dashboard can display and
  manage your orders.
- **Why:** to give you an order dashboard. This is **buyer personal information**
  and is processed solely to fulfill and track your sales. It is never sold or
  shared for advertising.

### d) Optional Google Sheet export (opt-in, off by default)
- **What:** listing metadata (title, SKU, prices, supplier URL).
- **Where it goes:** **only** to a Google Apps Script URL that **you** configure
  in Settings. The extension ships with **no default endpoint** — if you do not
  configure one, nothing is exported. No data is ever sent to a
  developer-controlled export server.

### e) Local diagnostics
- **What:** local usage counters and debug logs.
- **Where it goes:** they stay in `chrome.storage.local` on your device and are
  **not transmitted** anywhere. You can clear them at any time.

---

## 2. Where data is sent (complete list of external endpoints)

| Endpoint | Purpose |
|---|---|
| `https://ojxzssooylmydystjvdo.supabase.co` | SellerSuit backend: auth, listing creation, order sync, AI generation |
| `https://sellersuit.com` | SellerSuit web app / auth bridge |
| `https://www.ebay.com` (and locale variants) | Creating listings and reading your orders via your own eBay session |
| Amazon / Walmart / AliExpress domains | Reading the product page you choose to import |
| A Google Apps Script URL **you** configure | Optional Sheet export (off unless configured) |

No other network destinations are contacted. There are no third-party analytics,
advertising, or tracking SDKs.

---

## 3. Data sharing

We do **not** sell your data and do **not** share it with third parties for their
own purposes. Data is transmitted only to (a) SellerSuit's own backend, (b) eBay
and supplier sites you are acting on, and (c) an export endpoint you explicitly
configure.

---

## 4. Retention

- **Local data** (tokens, caches, logs) persists in `chrome.storage.local` until
  you log out, clear it, or uninstall the extension. Logging out and uninstalling
  removes local tokens and caches.
- **Server data** (your account, listings, synced orders) is retained by the
  SellerSuit backend for as long as your account is active. You may request
  deletion by contacting support (see below).

---

## 5. Your controls

- Log out from the dashboard to clear the extension's stored token.
- Leave the Google Sheet export unconfigured to disable all external export.
- Uninstall the extension to remove all local data.
- Request account/data deletion via support.

---

## 6. Security

- Session tokens are stored in `chrome.storage.local` and are verified
  server-side before any privileged action.
- The extension executes **no remote code** and contains no `eval()` /
  `new Function()` dynamic execution.
- URLs opened by the extension are restricted to `https:` and an allowlist of
  first-party and supported marketplace domains.
- Rich HTML previews built from scraped data are sanitized before rendering.

---

## 7. Contact

Questions or data-deletion requests: **support@sellersuit.com**
(Homepage: https://sellersuit.com)
