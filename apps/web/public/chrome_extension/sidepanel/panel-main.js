(function () {
  'use strict';

  /* ── Settings keys ────────────────────────── */
  const SETTINGS_KEY = 'ss_import_settings';

  /* ── State ────────────────────────────────── */
  let _state = null;
  let _removedImages = new Set();
  let _variations = [];   // [{ label, values: [string] }]
  let _busy = false;      // main button in-flight guard
  let _mode = 'single';      // 'single' | 'all'

  /* ── Views ────────────────────────────────── */
  const vLoading  = document.getElementById('view-loading');
  const vAuth     = document.getElementById('view-auth');
  const vMain     = document.getElementById('view-main');

  /* ── Main elements ────────────────────────── */
  const elVersion      = document.getElementById('panel-version');
  const elNoProduct    = document.getElementById('no-product');
  const elProductTabs  = document.getElementById('product-tabs');

  /* ── Settings fields ──────────────────────── */
  const inpMinQty      = document.getElementById('inp-min-qty');
  const inpShipping    = document.getElementById('inp-shipping');
  const togLowQty      = document.getElementById('tog-low-qty');
  const togAutoEdit    = document.getElementById('tog-auto-edit');
  const selUploadType  = document.getElementById('sel-upload-type');

  /* ── Quick edit fields ────────────────────── */
  const inpTitle       = document.getElementById('inp-title');
  const advImageGrid   = document.getElementById('adv-image-grid');
  const advNoImages    = document.getElementById('adv-no-images');
  const advVariations  = document.getElementById('adv-variations');
  const btnAddDim      = document.getElementById('btn-add-dimension');
  const inpAdvQty      = document.getElementById('inp-adv-qty');

  /* ── Actions ──────────────────────────────── */
  const btnMainAction  = document.getElementById('btn-main-action');
  const btnExtend      = document.getElementById('btn-extend');
  const btnAdvCancel   = document.getElementById('btn-adv-cancel');

  /* ── Toast ────────────────────────────────── */
  const toast = document.getElementById('toast');
  let _toastTimer = null;

  function showToast(msg, durationMs = 2500) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.add('hidden'), durationMs);
  }

  /* ── View switch ──────────────────────────── */
  function showView(name) {
    vLoading.classList.toggle('hidden', name !== 'loading');
    vAuth.classList.toggle('hidden', name !== 'auth');
    vMain.classList.toggle('hidden', name !== 'main');
  }

  /* ── Version ──────────────────────────────── */
  function loadVersion() {
    try {
      const mf = chrome.runtime.getManifest();
      if (elVersion && mf && mf.version) elVersion.textContent = 'v' + mf.version;
    } catch (_) {}
  }

  /* ── Settings persistence ─────────────────── */
  function saveSettings() {
    chrome.storage.local.set({
      [SETTINGS_KEY]: {
        minQty: parseInt(inpMinQty.value, 10) || 1,
        shipping: parseFloat(inpShipping.value) || 0,
        allowLowQty: togLowQty.checked,
        uploadType: selUploadType.value
      }
    });
  }

  function loadSettings() {
    chrome.storage.local.get(SETTINGS_KEY, data => {
      const s = data[SETTINGS_KEY] || {};
      if (s.minQty != null)      inpMinQty.value     = s.minQty;
      if (s.shipping != null)    inpShipping.value   = s.shipping;
      if (s.allowLowQty != null) togLowQty.checked   = s.allowLowQty;
      if (s.uploadType)          selUploadType.value = s.uploadType;
    });
    // Auto-edit is a top-level key — content scripts and panel.html read it
    // directly without knowing the side panel settings blob.
    if (togAutoEdit) {
      chrome.storage.local.get('autoEditEnabled', d => {
        togAutoEdit.checked = !!d.autoEditEnabled;
      });
      if (!togAutoEdit._bound) {
        togAutoEdit._bound = true;
        togAutoEdit.addEventListener('change', () => {
          chrome.storage.local.set({ autoEditEnabled: togAutoEdit.checked });
        });
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes.autoEditEnabled) {
            togAutoEdit.checked = !!changes.autoEditEnabled.newValue;
          }
        });
      }
    }
  }

  /* ── Auth ─────────────────────────────────── */
  function renderAuth(state) {
    if (!state) { showView('loading'); return; }
    if (!state.auth || !state.auth.isValid) { showView('auth'); return; }
    showView('main');
    renderMain(state);
  }

  /* ── Main action button ───────────────────────
     Single dynamic CTA. Before a product is loaded it scans ("Load Product" /
     "Load Variations"); once a product is in state it morphs to "List on eBay"
     (upload type — classic vs draft — comes from Listing settings). */
  function _mainButtonRole() {
    const hasProduct = !!(_state && _state.product);
    if (!hasProduct) return 'scan';
    const hasVars = _state.product.variants && _state.product.variants.length > 1;
    if (_mode === 'all' && !hasVars) return 'scan'; // need variations first
    return 'list';
  }

  function updateMainButton() {
    if (!btnMainAction || _busy) return;
    const role = _mainButtonRole();
    if (role === 'scan') {
      btnMainAction.textContent = _mode === 'all' ? 'Load Variations' : 'Load Product';
    } else {
      btnMainAction.textContent = 'List on eBay';
    }
  }

  async function onMainAction() {
    if (_busy) return;
    const role = _mainButtonRole();
    _busy = true;
    btnMainAction.disabled = true;

    try {
      if (role === 'scan') {
        btnMainAction.innerHTML = '<span class="btn-spinner btn-spinner-sm"></span> Loading…';
        const product = await doScan(_mode);
        if (product) renderPreviewCard(product);
      } else {
        btnMainAction.innerHTML = '<span class="btn-spinner btn-spinner-sm"></span>';
        await doAdvancedUpload(selUploadType.value === 'draft');
      }
    } finally {
      _busy = false;
      btnMainAction.disabled = false;
      updateMainButton();
    }
  }

  /* ── Main render ──────────────────────────── */
  function renderMain(state) {
    const hasProduct = !!(state.product);
    elNoProduct.classList.toggle('hidden', hasProduct);
    elProductTabs.classList.toggle('hidden', !hasProduct);
    if (btnExtend) btnExtend.classList.toggle('hidden', !hasProduct);
    if (btnAdvCancel) btnAdvCancel.classList.toggle('hidden', !hasProduct);

    if (hasProduct) {
      renderAdvancedEdit(state);
      renderPreviewCard(state.product);
    }
    updateMainButton();
    refreshPageStatus();
  }

  /* ── Advanced Edit render ─────────────────── */
  function renderAdvancedEdit(state) {
    const p = state.product;
    if (!p) return;

    if (!inpTitle._dirty) {
      inpTitle.value = p.title || '';
    }

    if (!inpAdvQty._dirty) {
      inpAdvQty.value = (p.quantity != null ? p.quantity : 1);
    }

    renderAdvImages(state.images || []);

    if (!advVariations._dirty) {
      buildVariationsFromVariants(state.variants || []);
    }
  }

  /* ── Image grid ───────────────────────────── */
  function renderAdvImages(images) {
    advImageGrid.innerHTML = '';
    if (!images || images.length === 0) {
      advNoImages.classList.remove('hidden');
      return;
    }
    advNoImages.classList.add('hidden');

    images.forEach((url, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'img-thumb' + (_removedImages.has(idx) ? ' removed' : '');
      thumb.dataset.idx = idx;

      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.onerror = () => { thumb.style.display = 'none'; };

      const overlay = document.createElement('div');
      overlay.className = 'img-thumb-overlay';

      thumb.appendChild(img);
      thumb.appendChild(overlay);
      thumb.addEventListener('click', () => {
        if (_removedImages.has(idx)) {
          _removedImages.delete(idx);
          thumb.classList.remove('removed');
        } else {
          _removedImages.add(idx);
          thumb.classList.add('removed');
        }
      });

      advImageGrid.appendChild(thumb);
    });
  }

  /* ── Variations builder ───────────────────── */
  function buildVariationsFromVariants(variants) {
    const dimMap = {};
    variants.forEach(v => {
      if (!v.attrs) return;
      Object.entries(v.attrs).forEach(([dim, val]) => {
        if (!dimMap[dim]) dimMap[dim] = new Set();
        // attrs values are { productName: "Gray" } objects — extract string
        const str = val && typeof val === 'object' ? (val.productName || '') : String(val || '');
        if (str) dimMap[dim].add(str);
      });
    });

    _variations = Object.entries(dimMap).map(([label, valSet]) => ({
      label,
      values: Array.from(valSet)
    }));

    renderVariationsEditor();
  }

  function renderVariationsEditor() {
    advVariations.innerHTML = '';
    _variations.forEach((dim, dIdx) => {
      advVariations.appendChild(buildDimEl(dim, dIdx));
    });
  }

  function buildDimEl(dim, dIdx) {
    const wrap = document.createElement('div');
    wrap.className = 'variation-dim';

    const header = document.createElement('div');
    header.className = 'variation-dim-header';

    const labelInp = document.createElement('input');
    labelInp.type = 'text';
    labelInp.value = dim.label;
    labelInp.placeholder = 'Dimension (e.g. Color)';
    labelInp.addEventListener('input', () => {
      _variations[dIdx].label = labelInp.value;
      advVariations._dirty = true;
    });

    const btnAdd = document.createElement('button');
    btnAdd.className = 'btn btn-outline btn-sm';
    btnAdd.textContent = 'Add';
    btnAdd.addEventListener('click', () => {
      _variations[dIdx].values.push('');
      advVariations._dirty = true;
      renderVariationsEditor();
    });

    const btnRemoveDim = document.createElement('button');
    btnRemoveDim.className = 'btn btn-ghost btn-sm btn-remove';
    btnRemoveDim.innerHTML = '&times;';
    btnRemoveDim.title = 'Remove dimension';
    btnRemoveDim.addEventListener('click', () => {
      _variations.splice(dIdx, 1);
      advVariations._dirty = true;
      renderVariationsEditor();
    });

    header.appendChild(labelInp);
    header.appendChild(btnAdd);
    header.appendChild(btnRemoveDim);
    wrap.appendChild(header);

    const valGrid = document.createElement('div');
    valGrid.className = 'variation-values';

    dim.values.forEach((val, vIdx) => {
      const row = document.createElement('div');
      row.className = 'variation-value-row';

      const valInp = document.createElement('input');
      valInp.type = 'text';
      valInp.value = val;
      valInp.placeholder = 'Value…';
      valInp.addEventListener('input', () => {
        _variations[dIdx].values[vIdx] = valInp.value;
        advVariations._dirty = true;
      });

      const btnDel = document.createElement('button');
      btnDel.className = 'btn btn-ghost btn-sm btn-remove';
      btnDel.innerHTML = '&times;';
      btnDel.addEventListener('click', () => {
        _variations[dIdx].values.splice(vIdx, 1);
        advVariations._dirty = true;
        renderVariationsEditor();
      });

      row.appendChild(valInp);
      row.appendChild(btnDel);
      valGrid.appendChild(row);
    });

    wrap.appendChild(valGrid);
    return wrap;
  }

  /* ── Mode toggle ─────────────────────────── */
  function initModeToggle() {
    const btnSingle = document.getElementById('btn-mode-single');
    const btnAll    = document.getElementById('btn-mode-all');
    const allFields = document.getElementById('all-mode-fields');

    function applyMode(mode) {
      _mode = mode;
      btnSingle.classList.toggle('active', mode === 'single');
      btnAll.classList.toggle('active', mode === 'all');
      allFields.classList.toggle('hidden', mode === 'single');
      updateMainButton();
    }

    btnSingle.addEventListener('click', () => applyMode('single'));
    btnAll.addEventListener('click', () => applyMode('all'));
  }

  /* ── Supplier page detection ─────────────────
     Registry-based: any registered supplier adapter (Amazon, Walmart, future
     AliExpress/Temu) makes the page importable. Falls back to an Amazon host
     check only if the suppliers bundle failed to load. */
  function isSupplierPage(url) {
    if (!url) return false;
    if (window.SSSupplierRegistry) return !!window.SSSupplierRegistry.match(url);
    return url.includes('amazon.');
  }

  /* ── Freshness guard ──────────────────────────
     A scanned product may only be uploaded while the active tab still shows
     that product (SSFreshness.isFresh: sourceId-in-URL, scannedUrl fallback).
     Tab switches/navigation re-evaluate live; upload paths hard-block. */

  function _productIsFreshForTab(tab) {
    const product = _state && _state.product;
    if (!product) return true; // nothing loaded — nothing stale
    if (!tab || !tab.url) return true; // cannot evaluate — don't block UI
    if (!isSupplierPage(tab.url)) return true; // off-supplier browsing (eBay, dashboard) is fine
    return window.SSFreshness ? window.SSFreshness.isFresh(product, tab.url) : true;
  }

  async function refreshPageStatus() {
    const tab = await getActiveTab();

    // 1. Supplier indicator — single minimal text label ("Amazon" / "Walmart"),
    //    hidden entirely off supplier pages.
    const statusEl = document.getElementById('page-status');
    const textEl = document.getElementById('page-status-text');
    if (statusEl && textEl) {
      const onSupplier = tab && tab.url && isSupplierPage(tab.url);
      if (onSupplier) {
        const adapter = window.SSSupplierRegistry && window.SSSupplierRegistry.match(tab.url);
        const name = adapter && adapter.supplierId
          ? adapter.supplierId.charAt(0).toUpperCase() + adapter.supplierId.slice(1)
          : 'Amazon';
        textEl.textContent = name;
      }
      statusEl.classList.toggle('hidden', !onSupplier);
    }

    // 2. Stale banner + CTA gating
    const fresh = _productIsFreshForTab(tab);
    const banner = document.getElementById('stale-banner');
    if (banner) banner.classList.toggle('hidden', fresh);
    const actions = document.querySelector('.action-stack');
    if (actions) actions.classList.toggle('stale', !fresh);
  }

  async function assertFreshForUpload() {
    const tab = await getActiveTab();
    if (_productIsFreshForTab(tab)) return true;
    showToast('This page shows a different product than the one loaded. Rescan first.');
    refreshPageStatus();
    return false;
  }

  function initTabWatchers() {
    try {
      chrome.tabs.onActivated.addListener(() => refreshPageStatus());
      chrome.tabs.onUpdated.addListener((tabId, info) => {
        if (info.url || info.status === 'complete') refreshPageStatus();
      });
    } catch (e) {
      console.warn('[SS panel] tab watchers unavailable:', e);
    }
  }

  /* ── Get active tab ───────────────────────── */
  function getActiveTab() {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    });
  }

  /* ── Scan product ─────────────────────────── */

  // Tie the freshly scanned product to the page it came from so the freshness
  // guard can detect navigation away (scannedUrl is SSFreshness's fallback key
  // for suppliers without a URL-visible sourceId).
  function _stampScan(tabUrl) {
    chrome.storage.local.get('currentProduct', (d) => {
      if (!d.currentProduct) return;
      chrome.storage.local.set({
        currentProduct: { ...d.currentProduct, scannedUrl: tabUrl, scannedAt: Date.now() }
      });
    });
  }

  async function doScan(mode) {
    const scanMode = mode || _mode || 'all';
    const tab = await getActiveTab();
    if (!tab) { showToast('No active tab found'); return null; }

    if (!tab.url || !isSupplierPage(tab.url)) {
      showToast('Navigate to a supported product page first');
      return null;
    }

    return new Promise(resolve => {
      if (scanMode === 'single') {
        chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_SINGLE' }, resp => {
          if (chrome.runtime.lastError) {
            showToast('Content script not ready — reload the page');
            resolve(null);
          } else if (!resp || !resp.success) {
            showToast('Scan failed: ' + ((resp && resp.error) || 'unknown'));
            resolve(null);
          } else {
            _stampScan(tab.url);
            refreshPageStatus();
            resolve(resp.data);
          }
        });
      } else {
        const options = {
          minQty: parseInt(inpMinQty.value, 10) || 0,
          allowLowQty: togLowQty.checked
        };
        chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_VARIANTS', options }, resp => {
          if (chrome.runtime.lastError) {
            showToast('Content script not ready — reload the page');
            resolve(null);
          } else if (!resp || !resp.success) {
            showToast('Scan failed: ' + ((resp && resp.error) || 'unknown'));
            resolve(null);
          } else {
            _stampScan(tab.url);
            refreshPageStatus();
            resolve(resp.data);
          }
        });
      }
    });
  }

  /* ── Preview card ─────────────────────────── */
  function renderPreviewCard(product) {
    if (!product) return;
    const wrap = document.getElementById('scan-preview');
    if (!wrap) return;

    const imgEl    = document.getElementById('preview-img');
    const titleEl  = document.getElementById('preview-title');
    const asinEl   = document.getElementById('preview-asin');
    const varsEl   = document.getElementById('preview-vars');
    const priceEl  = document.getElementById('preview-price');

    const img = (product.images && product.images[0]) || product.mainImage || '';
    if (imgEl) { imgEl.src = img || ''; imgEl.style.display = img ? '' : 'none'; }
    if (titleEl) titleEl.textContent = (product.title || '').slice(0, 80) + ((product.title || '').length > 80 ? '…' : '');
    if (asinEl) {
      const srcId = product.sourceId || product.asin || '';
      const idLabel = window.SSSupplierRegistry?.getMeta
        ? window.SSSupplierRegistry.getMeta(product.supplier).idLabel
        : 'ID';
      asinEl.textContent = srcId ? `${idLabel}: ${srcId}` : '';
    }
    const vc = product.variants ? product.variants.length : 0;
    if (varsEl) varsEl.textContent = vc > 1 ? vc + ' variations' : (vc === 1 ? '1 variant' : 'Single product');
    if (priceEl) {
      const fp = product.finalPrice || (product.pricing && product.pricing.finalPrice);
      const rp = product.raw_supplier_price || product.price || (product.pricing && product.pricing.rawPrice);
      priceEl.textContent = fp ? `$${parseFloat(fp).toFixed(2)} eBay` + (rp ? ` · $${parseFloat(rp).toFixed(2)} supplier` : '') : '';
    }

    wrap.classList.remove('hidden');
  }

  /* ── Upload — triggers eBay lister ─────────── */
  async function doAdvancedUpload(asDraft) {
    const product = _state && _state.product;
    if (!product) { showToast('No product loaded — scan first'); return; }

    // Stale guard: never upload a product the active page no longer shows
    if (!(await assertFreshForUpload())) return;

    try {
      // Phase 6: read draft for source-flagged fields
      let draft = null;
      if (typeof window.SSListingDraft !== 'undefined') {
        draft = await window.SSListingDraft.getDraft();
      }

      // Resolve title: panel input > draft > product
      const panelTitle = inpTitle.value.trim();
      const finalTitle = panelTitle || (draft && draft.title) || product.title || '';
      const titleSource = panelTitle ? 'manual' : ((draft && draft.title_source) || 'scraped');

      // Resolve description from draft
      const description = (draft && draft.description) || product.description || '';
      const descSource = (draft && draft.description_source) || 'scraped';

      // Resolve pricing: edited product > draft. Draft is scan-time state and
      // must not resurrect old Amazon calculated prices over panel edits.
      const draftFinalPrice = draft && draft.pricing && draft.pricing.finalPrice;
      const finalPrice = product.finalPrice || draftFinalPrice || 0;
      const priceSource = product.price_source || (draft && draft.price_source) || 'calculated';

      // Resolve SKU: edited product wins over scan-time draft.
      const draftSku = draft && draft.sku;
      const sku = product.ebaySku || draftSku || '';
      const skuSource = product.sku_source || (draft && draft.sku_source) || 'generated';

      const images = (product.images || []).filter((_, i) => !_removedImages.has(i));

      // Log sources (Phase 6)
      console.log('[SS Panel Upload] title_source:', titleSource, '| title:', finalTitle.slice(0, 60));
      console.log('[SS Panel Upload] price_source:', priceSource, '| finalPrice:', finalPrice);
      console.log('[SS Panel Upload] sku_source:', skuSource, '| sku:', sku);
      console.log('[SS Panel Upload] description_source:', descSource);

      // Build canonical product payload
      let ebayProduct = {
        ...product,
        title: finalTitle,
        description,
        images,
        ebaySku: sku,
        finalPrice,
        quantity: parseInt(inpAdvQty.value, 10) || 1,
        variations: _mode === 'single' ? [] : _variations,
        title_source: titleSource,
        description_source: descSource,
        price_source: priceSource,
        sku_source: skuSource,
      };
      if (window.SSVariationNormalizer) {
        ebayProduct = window.SSVariationNormalizer.normalizeProduct(ebayProduct, {
          dedupe: true,
          dropInvalid: true
        });
      }

      // Mirror to storage so panel stays in sync
      await chrome.storage.local.set({ currentProduct: ebayProduct });
      if (typeof window.SSListingDraft !== 'undefined') {
        await window.SSListingDraft.patchDraft({
          title: finalTitle,
          title_source: titleSource,
          description,
          description_source: descSource,
          sku,
          sku_source: skuSource,
          pricing: { ...(draft && draft.pricing), finalPrice },
          price_source: priceSource,
        });
      }

      // SW opens eBay tab + stores { [tabId]: { product, isImported: false } }
      chrome.runtime.sendMessage({
        action: 'import_ebay',
        product: ebayProduct,
        uploadType: asDraft ? 'draft' : 'classic'
      });

      showToast(asDraft ? 'Opening eBay draft…' : 'Opening eBay lister…');
    } catch (err) {
      showToast('Upload error: ' + err.message);
      console.error('[SS Panel Upload] error:', err);
    }
  }

  /* ── Extend — open panel.html tab with current sidebar state ── */
  async function doExtend() {
    const product = _state && _state.product;
    if (!product) { showToast('No product loaded — scan first'); return; }

    // Stale guard: the extended editor must open with the on-page product
    if (!(await assertFreshForUpload())) return;

    if (btnExtend) { btnExtend.disabled = true; btnExtend.textContent = 'Opening…'; }

    try {
      // Normalize variations from raw variants if not yet done
      const normalizedVariations = _variations.length > 0
        ? _variations
        : (function() {
            const dimMap = {};
            (product.variants || []).forEach(v => {
              if (!v.attrs) return;
              Object.entries(v.attrs).forEach(([dim, val]) => {
                if (!dimMap[dim]) dimMap[dim] = new Set();
                const str = val && typeof val === 'object' ? (val.productName || '') : String(val || '');
                if (str) dimMap[dim].add(str);
              });
            });
            return Object.entries(dimMap).map(([label, valSet]) => ({ label, values: Array.from(valSet) }));
          })();

      const finalTitle = (inpTitle.value || product.title || '').trim();
      const images = (product.images || []).filter((_, i) => !_removedImages.has(i));

      // Stamp SKUs onto variants before flush so extended panel + early DB sync have them
      const skuRoot = product.sourceId || product.parentAsin || product.asin || '';
      (product.variants || []).forEach(v => {
        if (!v.sku && window.SSSkuEngine) {
          v.sku = window.SSSkuEngine.buildReadable(skuRoot, v.attrs, window.SSSkuEngine.prefixFor(product.supplier));
        }
      });

      let mergedProduct = {
        ...product,
        title: finalTitle,
        images,
        quantity: parseInt(inpAdvQty.value, 10) || 1,
        variations: normalizedVariations
      };
      if (window.SSVariationNormalizer) {
        mergedProduct = window.SSVariationNormalizer.normalizeProduct(mergedProduct, {
          dedupe: true,
          dropInvalid: true
        });
      }

      // Flush to storage, then trigger in-page panel via content script
      await new Promise(resolve => chrome.storage.local.set({
        currentProduct: mergedProduct,
        panelSource: 'sidebar'
      }, resolve));

      const tab = await getActiveTab();
      if (!tab || !tab.id) { showToast('No active tab — navigate to a supported product page'); return; }

      await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: 'EXTEND_PANEL' }, resp => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Content script not ready'));
          } else {
            resolve(resp);
          }
        });
      });

      // Record which tab owns this extended session so the close handler can
      // reopen the side panel for the correct tab, not whatever is active later.
      chrome.storage.session.set({ ssPanelSourceTabId: tab.id }).catch(() => {});

      // Close the side panel — injected panel.html is now the active editor.
      // Only one of the two views should be visible at a time.
      chrome.runtime.sendMessage({ action: 'CLOSE_SIDE_PANEL', tabId: tab.id });
    } catch (err) {
      showToast('Extend failed: ' + err.message);
    } finally {
      if (btnExtend) { btnExtend.disabled = false; btnExtend.textContent = '⤢ Open full editor'; }
    }
  }

  // "Clear product" — drop the loaded product entirely so a stale item can
  // never linger between sourcing sessions. Storage removal flows back through
  // panel-store.onChanged → renderMain shows the empty scan state.
  function doAdvCancel() {
    inpTitle._dirty = false;
    inpAdvQty._dirty = false;
    advVariations._dirty = false;
    _removedImages.clear();
    _variations = [];
    chrome.storage.local.remove(['currentProduct', 'panelSource'], () => {
      showToast('Product cleared');
      refreshPageStatus();
    });
  }

  /* ── Log out ──────────────────────────────── */
  function doLogOut() {
    chrome.storage.local.remove(['saasToken', 'saasUser', 'userEmail'], () => {
      showView('auth');
    });
  }

  /* ── Sign in ──────────────────────────────── */
  function doSignIn() {
    chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' }, () => {});
    chrome.tabs.create({ url: 'https://app.sellersuite.com/login' });
  }

  /* ── Auth footer links ────────────────────── */
  function initAuthLinks() {
    const linkCreate = document.getElementById('link-create-account');
    const linkForgot = document.getElementById('link-forgot-pw');
    if (linkCreate) linkCreate.addEventListener('click', e => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://app.sellersuite.com/register' });
    });
    if (linkForgot) linkForgot.addEventListener('click', e => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://app.sellersuite.com/forgot-password' });
    });
  }

  /* ── Dirty tracking ───────────────────────── */
  function initDirtyTracking() {
    inpTitle.addEventListener('input', () => { inpTitle._dirty = true; });
    inpAdvQty.addEventListener('input', () => { inpAdvQty._dirty = true; });
  }

  /* ── Init ─────────────────────────────────── */
  function init() {
    showView('loading');
    loadVersion();
    loadSettings();
    initAuthLinks();
    initDirtyTracking();

    document.getElementById('btn-sign-in').addEventListener('click', doSignIn);
    document.getElementById('btn-log-out').addEventListener('click', doLogOut);

    initModeToggle();

    btnMainAction.addEventListener('click', onMainAction);

    [inpMinQty, inpShipping, togLowQty, selUploadType].forEach(el =>
      el.addEventListener('change', saveSettings)
    );

    btnAddDim.addEventListener('click', () => {
      _variations.push({ label: '', values: [''] });
      advVariations._dirty = true;
      renderVariationsEditor();
    });
    btnAdvCancel.addEventListener('click', doAdvCancel);
    if (btnExtend) btnExtend.addEventListener('click', doExtend);

    // Stale banner → rescan current page
    const btnRescan = document.getElementById('btn-rescan');
    if (btnRescan) {
      btnRescan.addEventListener('click', async () => {
        btnRescan.disabled = true;
        btnRescan.textContent = 'Rescanning…';
        await doScan(_mode);
        btnRescan.disabled = false;
        btnRescan.textContent = 'Rescan this page';
        refreshPageStatus();
      });
    }

    initTabWatchers();
    refreshPageStatus();

    window.SSPanelStore.subscribe(state => {
      _state = state;
      renderAuth(state);
    });

    const snap = window.SSPanelStore.getState();
    _state = snap;
    renderAuth(snap);

    // Phase 4: restore preview card from existing draft if present
    _restorePreviewFromDraft();
  }

  /* ── Restore preview from existing draft on panel open ── */
  async function _restorePreviewFromDraft() {
    try {
      // Try SSListingDraft first (session), fall back to currentProduct (local)
      let product = null;
      if (typeof window.SSListingDraft !== 'undefined') {
        const draft = await window.SSListingDraft.getDraft();
        if (draft) {
          // Convert draft back to product-like shape for preview
          product = {
            title: draft.title,
            sourceId: draft.sourceId,
            asin: draft.asin,
            images: draft.images,
            mainImage: draft.mainImage,
            variants: draft.variants,
            pricing: draft.pricing,
            finalPrice: draft.pricing && draft.pricing.finalPrice,
            raw_supplier_price: draft.pricing && draft.pricing.rawPrice,
            price: draft.pricing && draft.pricing.rawPrice,
          };
        }
      }
      if (!product) {
        const data = await new Promise(r => chrome.storage.local.get('currentProduct', r));
        product = data.currentProduct || null;
      }
      if (product) renderPreviewCard(product);
    } catch (e) {
      console.warn('[SS panel] _restorePreviewFromDraft error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
