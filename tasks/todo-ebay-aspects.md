# TODO — Fix eBay "item specific" errors (Amazon→eBay, match SuperDS)

Plan: `tasks/plan-ebay-aspects.md` · Source plan file: `C:\Users\MUTI\.claude\plans\steady-wondering-starfish.md`

## Phase 0 — Ground truth (BLOCKING) ▶ Checkpoint 1
- [x] 0a — Instrument `extractListingDraft` to dump real `attributeList` schema (dev log)
- [x] 0a — Scaffold `apps/extension/tests/fixtures/` + capture README
- [ ] 0b — (USER) Build dev, list ONE single-item Amazon product, copy `attributeList` dump from console → `fixtures/attributeList-single.json`
- [ ] 0b — (USER) DevTools Network: capture SuperDS `listing_draft` PUT req+resp (single) → `fixtures/superds-single.json`
- [ ] 0b — (USER) Capture OUR `listing_draft` PUT req+resp (single) → `fixtures/ours-single.json`
- [ ] 0b — (USER) Repeat both captures for a MULTI-VARIATION product → `fixtures/superds-multi.json`, `fixtures/ours-multi.json`, `fixtures/attributeList-multi.json`
- [ ] 0c — Diff SuperDS vs ours; record verified field names (required flag / selection mode / allowed-values) in this file
- [ ] **Checkpoint 1** — review field names + payload diff together before building mapper

## Phase 1 — aspect-mapper.js (pure + tested)
- [ ] Create `common/aspect-mapper.js` → `window.SSAspectMapper.buildAspects(attributeList, scrapedSpecs, opts)`
- [ ] Extract `matchAspectName` synonym map into the module (shared source of truth)
- [ ] Required detection from verified field; selection-only value validation; safe defaults; drop unknowns; multi-select
- [ ] Create `tests/aspect-mapper.test.js` (required-fill, selection match+reject, free-text, Brand default, unknown-drop, multi-select)
- [ ] `node --test apps/extension/tests/aspect-mapper.test.js` green

## Phase 2 — Wire into both paths ▶ Checkpoint 2
- [ ] Single: replace inline map+required-fill in `updateListing` with `buildAspects`
- [ ] Variation: add mapper output (listing-level item specifics) to `addVariations`/`msku-update`, matching SuperDS multi fixture
- [ ] Register `common/aspect-mapper.js` in `manifest.json` + `manifest.prod.json` BEFORE `ebay-listing-api.js`
- [ ] **Checkpoint 2** — clean editor on both single + multi paths

## Phase 3 — Category accuracy + safety net
- [ ] Improve category pick (highest-ranked leaf + brand/category hints); compare to SuperDS categoryId
- [ ] (Optional) post-save re-read + fill empty required + resave once

## Phase 4 — Tests + e2e
- [ ] `cd apps/extension && npm test` green (new + existing)
- [ ] Remove Phase-0 debug `console.log`
- [ ] `npm run prepare:dev`, load unpacked, list 3–5 varied products → clean editor each
- [ ] Final payload diff vs SuperDS fixture

## Verified field names (fill in after Phase 0c)
- Required flag field: `__TBD__`
- Selection-mode field + values: `__TBD__`
- Allowed-values list field: `__TBD__`
- Multi-variation item specifics location (msku body vs separate save): `__TBD__`
