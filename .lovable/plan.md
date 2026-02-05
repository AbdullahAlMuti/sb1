
## Goal
Add a public **Contact** page accessible at **/contact** (so it works as `https://www.sellersuit.com/contact`) without changing any existing business logic or flows.

## What I found in the codebase (relevant)
- Routing is defined in `src/App.tsx` using React Router (`BrowserRouter`).
- Footer currently shows a “Contact” link but it’s a placeholder (`href: "#"` in `src/components/Footer.tsx`).
- Legal pages (`PrivacyPolicy`, `TermsOfService`, `RefundPolicy`) follow a consistent public-page layout we can reuse.
- There is already a safe WhatsApp utility + UI component:
  - `src/lib/whatsapp.ts` (validates + `encodeURIComponent`)
  - `src/components/whatsapp/WhatsAppButton.tsx`

## Required info from you (blocking to finalize content)
You selected “Different email” and “WhatsApp button”.
Before implementing, I will need:
1) **Support email address** to display (example: `support@sellersuit.com` or any other you want).
2) **WhatsApp number** in international format **digits only** (8–15 digits), example: `15551234567`.
   - This matches the validator already used by `buildWhatsAppLink()`.

## Implementation plan (no business logic changes)
### 1) Create the Contact page UI (new route page)
- Create `src/pages/Contact.tsx` (public page).
- Layout will match the existing legal pages for consistency:
  - `min-h-screen bg-background`
  - `container max-w-4xl py-12 px-4`
  - “Back to Home” button (using `Link` + existing `Button` UI)
- Page content (simple + Web Store friendly):
  - Title: “Contact”
  - Short description (how to reach support)
  - Primary contact method:
    - Show email as text + a **“Email Support”** button linking to `mailto:...`
    - Use `encodeURIComponent` for subject/body if we add them (safe).
  - WhatsApp contact method:
    - Add `<WhatsAppButton phone_number="..." message="..." />`
    - Message will be short and generic (e.g., “Hi SellerSuit Support, I need help with …”)
- No form submission / no server email sending (so no backend changes, no new edge function).

### 2) Add the route to the app router
- Update `src/App.tsx`:
  - Add `import Contact from "./pages/Contact";`
  - Add `<Route path="/contact" element={<Contact />} />`
- Optional (only if you want): add alias route `/contact-us` pointing to the same component to catch common user typing.

### 3) Wire “Contact” into existing navigation points (safe, non-business)
- Update `src/components/Footer.tsx`
  - Change Company → “Contact” from `"#"` to `"/contact"`.
  - Use `Link` for internal routes (like the legal section already does) to avoid full page reloads.
- Update `src/pages/dashboard/Subscription.tsx`
  - The “Contact Support” button currently does nothing.
  - Make it navigate to `/contact` using `useNavigate()` (simple UI wiring only).

### 4) Ensure it works on Vercel + www domain
- You’re on Vercel and we already added SPA rewrites earlier, so `/contact` should not 404 on refresh.
- Verification on production (after publish):
  - Open and hard-refresh:
    - `https://www.sellersuit.com/contact`
    - `https://sellersuit.com/contact`
  - Confirm both load and do not redirect to auth.

### 5) QA checklist (quick but complete)
- Desktop + mobile:
  - Footer “Contact” navigates correctly
  - `/contact` loads directly and on refresh
  - “Email Support” opens the email client with correct address
  - WhatsApp button opens WhatsApp web/app with the prefilled message
- Ensure no console errors on `/contact`

## Non-goals (explicitly not changing)
- No changes to auth, subscriptions, scraping, listings, or any edge functions.
- No database writes, no new backend endpoints.
- No changes to existing pages’ business logic; only adding a new public page and linking to it.

## Files expected to change/add (for your review)
- Add: `src/pages/Contact.tsx`
- Edit: `src/App.tsx` (add route)
- Edit: `src/components/Footer.tsx` (link Contact to /contact)
- Edit: `src/pages/dashboard/Subscription.tsx` (button navigates to /contact)

## Small content questions (so we match your brand/compliance)
- Provide the exact **support email** to display.
- Provide the **WhatsApp number** (digits only, 8–15).
- Do you want the Contact page to mention expected response time (e.g., “within 24 hours”), yes/no?
