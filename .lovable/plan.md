

# Fix Listings Page UI and Data Formatting Issues

This plan addresses three issues on the `/dashboard/listings` page:
1. Prices displaying without decimal places
2. Prices being editable when they should be read-only
3. Amazon product images not displaying properly

---

## Issue Analysis

### 1. Price Formatting (No Decimals)
**Current behavior:** The prices are stored as strings in `rowEdits` using `String(listing.ebay_price)`, which converts `62` to `"62"` instead of `"62.00"`.

**Root cause locations:**
- `getEditForListing()` (lines 521-529): Converts prices to strings without formatting
- `setRowEdits()` after save (lines 598-605): Same issue
- Initial buffer setup in `fetchListings()` (lines 488-499): Same issue

### 2. Prices Are Editable
**Current behavior:** Both eBay and Amazon prices are displayed as `<Input>` elements with `onChange` handlers, allowing users to edit them.

**Root cause location:**
- Table cells (lines 1588-1611): Using `<Input>` components with editable behavior

### 3. Amazon Image Not Displaying
**Current behavior:** The code tries to render images but has a flawed fallback pattern. When `onError` fires, it hides the broken image but doesn't properly show the fallback icon.

**Root cause location:**
- Image rendering (lines 1533-1547): The fallback logic is broken - when the image fails to load, it tries to access `nextElementSibling` which may not work correctly since the fallback `PackageIcon` uses `listing.image_url && "hidden"` as its class condition.

---

## Implementation Plan

### Step 1: Create a Price Formatting Helper

Add a helper function to format prices consistently with 2 decimal places.

**File:** `src/pages/dashboard/Listings.tsx`

```typescript
function formatPriceForDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toFixed(2);
}
```

### Step 2: Update Price Display to Use Formatting

Replace all instances where prices are converted to strings with the new formatter:

1. In `getEditForListing()` - format prices with `.toFixed(2)`
2. In `fetchListings()` rowEdits initialization - use formatted prices
3. In `setRowEdits()` after save - use formatted prices

### Step 3: Make eBay and Amazon Price Fields Read-Only

Change the price `<Input>` elements to display-only elements:

**Current (editable input):**
```tsx
<Input
  type="number"
  value={edit.ebay_price}
  onChange={(e) => updateRowEdit(listing.id, { ebay_price: e.target.value })}
  ...
/>
```

**New (read-only display):**
```tsx
<span className="h-7 text-[11px] font-mono px-2 text-right block leading-7 tabular-nums">
  {listing.ebay_price !== null ? `$${listing.ebay_price.toFixed(2)}` : "—"}
</span>
```

This will:
- Display prices with 2 decimal places and dollar sign
- Be completely non-editable (not an input at all)
- Use tabular numbers for alignment
- Show a dash for missing values

### Step 4: Fix Image Rendering with Proper Fallback

Replace the current broken image handling with a state-based approach:

**Current (broken):**
```tsx
<img 
  src={listing.image_url} 
  onError={(e) => {
    (e.target as HTMLImageElement).style.display = 'none';
    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
  }}
/>
<PackageIcon className={cn("h-3 w-3", listing.image_url && "hidden")} />
```

**New (fixed):**
```tsx
{listing.image_url ? (
  <img 
    src={listing.image_url} 
    alt={listing.title || 'Product'} 
    className="h-full w-full object-cover"
    onError={(e) => {
      const img = e.currentTarget;
      img.style.display = 'none';
      const fallback = img.parentElement?.querySelector('.fallback-icon');
      if (fallback) fallback.classList.remove('hidden');
    }}
  />
) : null}
<PackageIcon className={cn(
  "h-3 w-3 text-muted-foreground/50 fallback-icon", 
  listing.image_url ? "hidden" : ""
)} />
```

This ensures:
- The fallback icon is always in the DOM
- When image loads successfully, fallback stays hidden
- When image fails, the fallback is revealed
- When no image URL exists, fallback shows immediately

### Step 5: Clean Up Unused Edit State for Prices

Since prices are now read-only, we can simplify:

1. Remove `ebay_price` and `amazon_price` from `ListingRowEdits` type
2. Update the edit schema to only include `sku`
3. Update all references to `edit.ebay_price` and `edit.amazon_price`

However, to minimize changes and maintain backward compatibility, we'll keep the type but simply not use those fields in the UI.

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/dashboard/Listings.tsx` | Add `formatPriceForDisplay()` helper, update `getEditForListing()` and related functions, replace price `<Input>` with read-only `<span>`, fix image fallback logic |

---

## Expected Outcomes

After implementation:
- **Prices:** Will always show 2 decimal places (e.g., `$62.00`, `$39.00`)
- **Editability:** Users can see prices but cannot modify them
- **Images:** Product thumbnails will display when URL exists, with graceful fallback to icon when image fails to load

