# Chrome Extension Connection & Integration Guide

This directory contains the standalone Chrome Extension code, separated from the backend infrastructure. This guide explains the structure and how to connect the extension to your Supabase-powered backend.

## Directory Structure

*   **`manifest.json`**: The core configuration file for the extension (Manifest V3). Defines permissions, background scripts, content scripts, and web accessible resources.
*   **`background.js`**: The service worker that runs in the background. **This is the primary place where you will likely integrate Supabase auth listeners or API coordination.**
*   **`common/`**: Shared utilities used across the extension.
    *   `storage.js`: Handles local storage. **Modify this to sync storage with Supabase if needed.**
    *   `analytics.js`: Analytics tracking.
*   **`content_scripts/`**: Scripts that inject into specific websites (Amazon, Walmart, eBay, etc.) to scrape data or manipulate the DOM.
*   **`ui/`**: User interface components (styles, panels) injected into pages.
    *   `panel.html` / `panel.js`: The main product panel UI injected into Amazon/Walmart pages.
    *   `editor_frame.html`: The image editor interface.
*   **`popup.html` / `popup.js`**: The little window that appears when you click the extension icon.

## Connecting to Supabase

To connect this extension to your Supabase backend, you will typically need to:

### 1. Install Supabase Client (Optional but Recommended)
Since Chrome Extensions don't natively support npm modules without a bundler (like Parcel or Webpack), the easiest way to add Supabase is to include it via CDN in your HTML files or use a bundler.

**Method A: CDN (for HTML files like `popup.html`)**
Add this to the `<head>` of your HTML files:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

**Method B: Bundling (Recommended for Production)**
Set up a bundler (Vite/Webpack) to import `@supabase/supabase-js` directly into your `background.js` or content scripts.

### 2. Initialize Supabase
In a shared utility file (e.g., create `common/supabase.js` or add to `background.js`):

```javascript
// Example initialization
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase ? 
    window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : 
    null; // Handle case where script isn't loaded yet
```

### 3. Authentication
The extension can share authentication state with your frontend/dashboard if they are on the same domain or using OAuth. For a standalone extension:
- Use `supabase.auth.signInWithPassword` in `popup.js`.
- Store the session token in `chrome.storage.local` to access it in `background.js`.

### 4. API Requests
Replace direct fetch/XHR calls in `background.js` or `content_scripts` with Supabase client calls:

**Before (Example):**
```javascript
fetch('https://your-api.com/save-product', {
    method: 'POST',
    body: JSON.stringify(data)
});
```

**After (Supabase):**
```javascript
const { data, error } = await supabase
    .from('products')
    .insert([ productData ]);
```

## Integration Points

-   **`background.js`**: Best place to handle database writes to ensure they complete even if the popup is closed.
-   **`content_scripts/amazon_injector.js`**: Where product data is scraped. Pass this data to `background.js` via `chrome.runtime.sendMessage`, then let `background.js` save it to Supabase.
-   **`ui/panel.js`**: Connect this to Supabase to display user settings or generated content.

## Next Steps
1.  Set up your Supabase project URL and Keys.
2.  Decide on an authentication strategy (User login inside extension vs. API Key).
3.  Update `manifest.json` `host_permissions` to include your Supabase URL if not using the JS client.
