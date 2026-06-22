# Phase 0 capture fixtures — eBay item-specifics ground truth

These files ground the aspect-mapper fix (`tasks/plan-ebay-aspects.md`). The current code
**guesses** eBay's attribute-schema field names; these captures replace the guesses with
verified data. Capture on a real Amazon→eBay list (dev build), one **single-item** product
and one **multi-variation** product.

## What to capture

### 1. Real attribute schema (already instrumented)
A temporary `console.log('[SS DEBUG attributeList] …')` was added to `extractListingDraft`
in `common/ebay-listing-api.js`. When you list a product, the eBay tab's DevTools console
prints the full `attributeList`. Copy that JSON here:
- `attributeList-single.json`
- `attributeList-multi.json`

For a representative **required** aspect (e.g. Brand, Type), note the real field names for:
- the **required** flag (is it `required`, `usage`, `usageConstraint`, `minValues`, …?)
- the **selection mode** (free-text vs selection-only)
- the **allowed-values** list

### 2. SuperDS vs ours — listing_draft PUT payloads
DevTools → Network → filter `listing_draft`. Find the
`PUT https://www.ebay.com/lstng/api/listing_draft/{draftId}?mode=AddItem` request.
Right-click → Copy → Copy request/response (or save the **Request Payload** + **Response**
JSON). Capture the same product with **SuperDS** and with **our extension**:
- `superds-single.json`  — `{ "request": {...}, "response": {...}, "url": "..." }`
- `ours-single.json`
- `superds-multi.json`   — for the multi-variation product (also grab the `msku-update` POST body)
- `ours-multi.json`

> Tip: include the request `url` so we can compare the `categoryId` SuperDS lands on.

## After capturing
Fill in the **Verified field names** section at the bottom of `tasks/todo-ebay-aspects.md`,
then we proceed past Checkpoint 1 to build `common/aspect-mapper.js` against real data.

(These JSON fixtures are also reused as unit-test inputs in `tests/aspect-mapper.test.js`.)
