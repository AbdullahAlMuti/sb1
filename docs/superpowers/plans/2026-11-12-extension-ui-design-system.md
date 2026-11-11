# Extension UI — one design system across all panels

Date: 2026-11-12 · Branch: `fix/error-free-listing`
Skills applied: design-critique, design-system, accessibility-review, ux-copy.

## 1. Audit (what is there today)

Measured from the CSS and from screenshots of each surface.

| Surface | File | Accent | Distinct hex colours | Font sizes | Radii | `:focus-visible` rules | Responsive rules |
|---|---|---|---|---|---|---|---|
| Side panel | `sidepanel/side-panel.css` | black | 24 | 10 | 4 | 0 | 0 |
| Full editor | `ui/panel.css` | blue `#3b82f6` | 59 | 14 | 13 | 1 | 16 |
| Image editor | `ui/editor-popup.css` | indigo/purple gradient | 43 | 9 | — | 3 | 7 |
| Amazon card | `ui/listing-card.css` | orange | 19 | 3 | 3 | 3 | 0 |

**Design critique — why it reads as assembled, not designed**

| Finding | Severity |
|---|---|
| Four accents (black, blue, purple, orange) for the same primary action "list this product". The eye cannot learn what "primary" looks like. | Critical |
| Image editor uses emoji as icons on every button and in its title. Emoji render differently per OS and cannot be themed. | Critical |
| Three font stacks (Inter, Plus Jakarta Sans, Arial) and ~30 font sizes with no shared scale. | Moderate |
| No visible keyboard focus in the side panel; 13 different corner radii in the editor. | Moderate |
| Purple gradients and glass effects in the image editor against flat neutral surfaces elsewhere. | Moderate |
| Side panel has no rule for narrow or wide docking widths; the title character counter in the editor reads `0 / 80` for a 70-character title. | Moderate |
| What works: generous whitespace in the side panel, the editor's card grouping, the readiness checklist wording. Keep these. | — |

## 2. Design prompt (the brief every change is held to)

> **Product.** SellerSuit is a working tool for eBay sellers who list dozens of products a day from supplier pages. They are mid-task, scanning quickly, often with the panel docked beside a busy Amazon page.
>
> **Feel.** Quiet, exact, trustworthy — a professional instrument, like a good accounting or logistics tool. Never playful, never decorative. If a pixel does not help the seller decide or act, remove it.
>
> **One system.** Every surface (side panel, full editor, image editor, on-page card) draws from the same tokens. A seller moving between them must feel they never left the product.
>
> **Colour.** Slate neutrals carry 90% of the interface. One brand blue marks the primary action, selection and focus — nothing else. Green, amber and red appear only to state success, caution and blocking problems, always with text, never colour alone. No gradients, no glass, no glow.
>
> **Type.** One family (Inter, falling back to the system UI font). Six sizes only: 11, 12, 13, 14, 16, 20. Weight carries hierarchy: 400 body, 500 labels and controls, 600 headings. Numbers that are compared (prices, profit, stock) use tabular figures.
>
> **Space and shape.** 4-pixel grid. Three radii: 6 for controls, 8 for cards, 12 for dialogs. Borders before shadows; shadows only for things that float.
>
> **Icons.** One line-icon set, 1.75 stroke, drawn as inline SVG. No emoji anywhere in the interface.
>
> **States.** Every control has default, hover, active, focus-visible, disabled and loading. Focus is a 2-pixel blue ring, always visible on keyboard use.
>
> **Responsive.** Each panel adapts to its own width (container queries), from 320 to 1600 pixels, with no horizontal scroll and no clipped controls. Touch targets at least 32 pixels in dense tools, 40 for primary actions.
>
> **Accessibility.** Text contrast at least 4.5:1, control boundaries 3:1, full keyboard reach, motion disabled under `prefers-reduced-motion`.
>
> **Words.** Sentence case. Buttons start with a verb and name the outcome ("Upload to eBay", "Save draft"). Errors say what happened, why, and what to do next. The same thing has the same name everywhere.
>
> **Listing copy (titles and descriptions).** Titles: 80 characters maximum, front-load the item's identity (brand, product type, key attribute, size/quantity), no ALL CAPS, no promotional words ("best", "hot", "free shipping"), no supplier names, no punctuation stuffing. Descriptions: plain, factual, scannable; what it is, what is included, key specifications, condition; no shipping or returns promises (those live in the listing's own sections), no claims the product page does not support.

## 3. Tokens

Single source: `apps/extension/ui/tokens.css` (`--ds-*`). Because the full editor's CSS is injected into supplier pages as text, a shared file cannot be `@import`ed there; `scripts/sync-design-tokens.js` copies the token block into each stylesheet between markers, and a test fails if any copy drifts.

Each surface keeps its existing variable names, re-pointed at the tokens — so thousands of existing rules change appearance without being rewritten.

## 4. Plan

- [ ] **T1 Tokens** — `ui/tokens.css`, sync script, drift test.
- [ ] **T2 Side panel** — re-point variables; brand-blue primary; focus ring; reduced motion; container-width rules; tabular prices.
- [ ] **T3 Full editor** — re-point `--x-*` / `--ss-*`; one font; radii and shadow from tokens; fix the title character counter.
- [ ] **T4 Image editor** — re-point theme to tokens (no purple, no gradients, no glass); replace emoji with SVG icons; responsive tool rail.
- [ ] **T5 Amazon card** — primary button in brand blue.
- [ ] **T6 Listing copy** — title rules enforced in code (`_enforceEbayTitle` + a title quality checker shown in the editor); AI prompts for title and description aligned with the brief.
- [ ] **T7 Verify** — tests, build, screenshots of each surface at 360 / 720 / 1280 in the preview harness; list what could not be verified.

## 5. Out of scope here

Moving the on-page editor into a Shadow DOM, and redesigning information architecture (what lives in which panel). Both are worth doing; neither is needed to make the three panels look and behave like one product.
