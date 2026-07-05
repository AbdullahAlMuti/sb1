# Chrome Web Store — Data Safety Declaration (SellerSuit)

Use this to fill the CWS **Privacy practices** tab. It mirrors the actual code
paths after the W1/W2/W4/W5 hardening.

## Single purpose (paste into listing)
> SellerSuit helps eBay sellers create listings from supported supplier pages
> (Amazon, Walmart, AliExpress) and manage their eBay orders from one dashboard.

## Permission justifications
| Permission | Justification |
|---|---|
| `storage` / `unlimitedStorage` | Cache the signed-in session, product drafts, and images locally. |
| `scripting` | Read the product/order page the user is acting on and inject the listing UI. |
| `tabs` | Open the eBay listing tab and track its load state during the flow. |
| `alarms` | Schedule periodic session re-verification. |
| `sidePanel` | Render the import/edit UI in the side panel. |
| Host permissions | Scoped to supplier sites, eBay, SellerSuit, and the Supabase backend. No `<all_urls>`. |

## Data types collected → declare "Yes"
| Data type | Collected | Sent off device | Purpose | Sold? |
|---|---|---|---|---|
| Personally identifiable info (buyer **name/address** from eBay orders) | Yes (only on order sync) | Yes → SellerSuit backend | App functionality (order dashboard) | No |
| Financial info (order totals, listing prices) | Yes | Yes → SellerSuit backend | App functionality | No |
| Authentication info (session token, account email/ID) | Yes | Yes → SellerSuit backend | App functionality / account management | No |
| Product content (title, description, images) | Yes (on import) | Yes → SellerSuit backend + eBay | App functionality (listing creation) | No |
| App activity / diagnostics | Yes | **No** (local only) | Debugging on device | No |

## Data handling disclosures (check these boxes)
- ✔ Data is encrypted in transit (HTTPS to all endpoints).
- ✔ Users can request data deletion (support@sellersuit.com).
- ✔ No data sold to third parties.
- ✔ No data used for advertising or unrelated purposes.
- ✔ Complies with the Limited Use requirements.

## Not collected / not sent
- No browsing history, no keystroke logging, no fingerprinting.
- Local usage logs and caches are never transmitted.
- Optional Google Sheet export is **off by default** and sends only to a
  user-configured endpoint (no developer-owned default).

## Required links
- Privacy policy URL: host `PRIVACY_POLICY.md` at e.g. `https://sellersuit.com/privacy`
  and paste that URL into the CWS listing.
