const fs = require('fs');

const html = <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SellerSuit Panel</title>
  <link rel="stylesheet" href="panel.css">
</head>
<body>
  <div id="snipe-root-wrapper" class="panel-shell unified-workspace">
    
    <!-- STICKY TOP BAR -->
    <header class="workspace-header">
      <div class="brand-zone">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--brand-primary)"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        <span class="brand-title">SellerSuit</span>
      </div>
      
      <div class="header-gallery-actions">
        <button class="btn btn-icon btn-ghost" id="image-mode-toggle" title="Switch Extraction Mode"><span id="mode-label">Fast</span></button>
        <button class="btn btn-icon btn-ghost" id="refresh-images-btn" title="Refresh Images">?</button>
        <button class="btn btn-icon btn-ghost" id="download-images-btn" title="Download All">?</button>
      </div>

      <div class="auth-status-bar" id="auth-status-bar">
        <div class="auth-status-content">
          <span class="auth-status-icon" id="auth-status-icon">?</span>
          <span class="auth-status-text" id="auth-status-text">Checking...</span>
        </div>
        <button class="btn btn-sm btn-auth" id="auth-action-btn" style="display: none;">Login</button>
      </div>
    </header>

    <!-- SCROLLABLE MAIN CONTENT -->
    <main class="workspace-content" id="snipe-main-container">
      
      <!-- IMAGE STRIP COMPACT -->
      <section class="tool-section gallery-section">
        <div class="gallery-scroll" id="snipe-image-gallery">
          <div class="gallery-empty"><span>No images available</span></div>
          <div class="dummy-gallery" style="display: none;"></div>
        </div>
      </section>

      <!-- TITLES SECTION -->
      <section class="tool-section">
        <div class="section-header">
          <h3>AI Titles</h3>
          <div class="section-actions">
            <select class="select-title-count" id="title-count-select"><option value="3">3</option><option value="5">5</option><option value="10">10</option></select>
            <button class="btn btn-ghost btn-sm" id="toggle-edit-titles-btn"><span id="edit-toggle-label">Edit</span></button>
            <button class="btn btn-ghost btn-sm" id="clear-titles-btn">Clear</button>
            <button class="btn btn-primary btn-sm" id="generate-ai-titles-btn">Generate</button>
            <button class="btn btn-ghost btn-sm" id="paste-title-to-ebay-btn" style="display:none">Paste to eBay</button>
          </div>
        </div>
        
        <div class="selected-title-card ai-title-container" id="ai-title-container">
          <div class="ai-title-display st-text" id="ai-generated-title">Click "Generate" to create optimized eBay title...</div>
          <div class="title-meta">
            <span class="ai-title-counter st-char-count" id="ai-title-counter">0 / 80</span>
            <button class="btn btn-sm btn-ghost btn-copy-title" id="copy-title-btn" style="display: none;">Copy</button>
          </div>
        </div>

        <div class="title-list" id="snipe-title-list">
          <!-- Option 1 -->
          <div class="inline-title-card selected" id="ai-title-option-1">
            <span class="inline-title-rank">#1</span>
            <div class="inline-title-badge best">Best</div>
            <div class="inline-title-text text-muted" id="ai-title-option-1-text">Title option 1 will appear here...</div>
            <span class="title-char-count" id="ai-title-option-1-count">0 chars</span>
            <div class="inline-title-actions">
              <button class="btn btn-sm inline-title-use" id="ai-title-option-1-use">Selected</button>
              <button class="btn btn-sm btn-ghost inline-title-copy" id="ai-title-option-1-copy">Copy</button>
            </div>
          </div>
          <!-- Option 2 -->
          <div class="inline-title-card" id="ai-title-option-2">
            <span class="inline-title-rank">#2</span>
            <div class="inline-title-badge recommended">Rec</div>
            <div class="inline-title-text text-muted" id="ai-title-option-2-text">Title option 2 will appear here...</div>
            <span class="title-char-count" id="ai-title-option-2-count">0 chars</span>
            <div class="inline-title-actions">
              <button class="btn btn-sm inline-title-use" id="ai-title-option-2-use">Use</button>
              <button class="btn btn-sm btn-ghost inline-title-copy" id="ai-title-option-2-copy">Copy</button>
            </div>
          </div>
          <!-- Option 3 -->
          <div class="inline-title-card" id="ai-title-option-3">
            <span class="inline-title-rank">#3</span>
            <div class="inline-title-badge alternative">Alt</div>
            <div class="inline-title-text text-muted" id="ai-title-option-3-text">Title option 3 will appear here...</div>
            <span class="title-char-count" id="ai-title-option-3-count">0 chars</span>
            <div class="inline-title-actions">
              <button class="btn btn-sm inline-title-use" id="ai-title-option-3-use">Use</button>
              <button class="btn btn-sm btn-ghost inline-title-copy" id="ai-title-option-3-copy">Copy</button>
            </div>
          </div>
        </div>
      </section>

      <!-- DESCRIPTION SECTION -->
      <section class="tool-section">
        <div class="section-header">
          <h3>Description</h3>
          <div class="section-actions">
            <button class="btn btn-sm btn-ghost" id="copy-description-btn" disabled>Copy HTML</button>
            <button class="btn btn-primary btn-sm" id="generate-description-btn">Generate</button>
          </div>
        </div>
        <div class="description-content">
          <div class="description-preview" id="description-preview">
            <div class="description-placeholder description-empty-state">
              <h4>No description generated yet</h4>
            </div>
          </div>
        </div>
      </section>

      <!-- PRICING / SKU ROW (Flattened from bottom bar) -->
      <section class="tool-section sku-price-row">
        <button class="btn btn-ghost btn-sm" id="quick-calc-btn">$</button>
        <div class="input-inline">
          <input type="text" id="sell-it-for-input" placeholder="Price">
        </div>
        <select id="sku-prefix" class="select-inline"><option value="AB">AB</option><option value="RC">RC</option></select>
        <div class="input-inline input-sku">
          <input type="text" id="sku-input" placeholder="SKU" readonly>
        </div>
        <button class="btn btn-secondary btn-sm" id="generate-sku-btn">Gen SKU</button>
      </section>

    </main>

    <!-- STICKY BOTTOM ACTION BAR -->
    <footer class="workspace-actions bottom-action-toolbar">
      <!-- Primary Action (Elevated Conversion CTA) -->
      <button class="btn btn-primary btn-full" id="paste-description-btn" disabled>Paste Description to eBay</button>
      
      <div class="secondary-actions-row">
        <button class="btn btn-secondary" id="snipe-title-btn">Snipe Title</button>
        <button class="btn btn-secondary" id="opti-list-btn">Opti-List</button>
        <button class="btn btn-ghost" id="copy-btn">Copy</button>
      </div>

      <!-- Overflow Utils -->
      <div class="utils-row">
        <button class="btn btn-tiny btn-ghost" id="product-details-btn">Details</button>
        <button class="btn btn-tiny btn-ghost" id="scrape-preview-btn">Preview Scrape</button>
        <button class="btn btn-tiny btn-ghost" id="scrape-all-data-btn">Scrape All</button>
        <button class="btn btn-tiny btn-ghost" id="calculator-btn">Calc</button>
      </div>
    </footer>

    <!-- POPUPS -->
    <div id="calculator-popup" class="calculator-popup" style="display: none;">
      <div class="calculator-overlay"></div>
      <div class="calculator-modal">
        <div class="calculator-header">
          <span>Calculator</span><button id="calculator-close-btn">X</button>
        </div>
        <div class="calculator-content">
          <input type="number" id="supplier-price" placeholder="Product Cost"><input type="number" id="tax-percent" value="9"><input type="number" id="tracking-fee" value="0.20"><input type="number" id="ebay-fee-percent" value="20"><input type="number" id="promo-fee-percent" value="10"><input type="number" id="desired-profit">
          <div id="calculator-result"><div id="final-price">.00</div></div>
        </div>
      </div>
    </div>

    <div id="scrape-preview-drawer" class="scrape-drawer" style="display: none;">
      <div class="scrape-drawer-overlay"></div>
      <div class="scrape-drawer-panel">
        <button id="scrape-refresh-btn">Refresh</button><button id="scrape-copy-json-btn">Copy</button><button id="scrape-drawer-close-btn">X</button>
        <div id="scrape-summary"></div><pre id="scrape-json-preview"></pre>
      </div>
    </div>

    <div id="title-selection-popup" class="title-popup" style="display: none;">
      <div class="title-popup-overlay"></div><div class="title-popup-modal"><button id="title-popup-close-btn">X</button><div id="title-popup-list"></div></div>
    </div>

  </div>

  <script src="../common/config.js"></script>
  <script src="../common/performance.js"></script>
  <script src="../common/ui.js"></script>
  <script src="../common/auth-helper.js"></script>
  <script src="../common/image-renderer.js"></script>
  <script src="../common/full_view_image_extractor.js"></script>
  <script src="../common/description-generator.js"></script>
  <script src="panel.js"></script>
</body>
</html>;

fs.writeFileSync('ui/panel.html', html);
console.log('HTML rewritten.');
