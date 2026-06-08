(function () {
  'use strict';

  /* ── Settings keys ────────────────────────── */
  const SETTINGS_KEY = 'ss_import_settings';

  /* ── State ────────────────────────────────── */
  let _state = null;
  let _removedImages = new Set();
  let _variations = [];   // [{ label, values: [string] }]
  let _importing = false;

  /* ── Views ────────────────────────────────── */
  const vLoading  = document.getElementById('view-loading');
  const vAuth     = document.getElementById('view-auth');
  const vMain     = document.getElementById('view-main');

  /* ── Main elements ────────────────────────── */
  const elVersion      = document.getElementById('panel-version');
  const elStoreSelect  = document.getElementById('store-select');
  const elEbayWarning  = document.getElementById('ebay-warning');
  const elNoProduct    = document.getElementById('no-product');
  const elProductTabs  = document.getElementById('product-tabs');

  /* ── Import tab ───────────────────────────── */
  const inpMinQty      = document.getElementById('inp-min-qty');
  const inpShipping    = document.getElementById('inp-shipping');
  const togLowQty      = document.getElementById('tog-low-qty');
  const selUploadType  = document.getElementById('sel-upload-type');
  const btnStartImport = document.getElementById('btn-start-import');

  /* ── Advanced Edit tab ────────────────────── */
  const inpTitle       = document.getElementById('inp-title');
  const advImageGrid   = document.getElementById('adv-image-grid');
  const advNoImages    = document.getElementById('adv-no-images');
  const advVariations  = document.getElementById('adv-variations');
  const btnAddDim      = document.getElementById('btn-add-dimension');
  const inpAdvQty      = document.getElementById('inp-adv-qty');
  const btnAdvUpload   = document.getElementById('btn-adv-upload');
  const btnAdvDraft    = document.getElementById('btn-adv-draft');
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

  /* ── Tab switching ────────────────────────── */
  function initInnerTabs() {
    const tabNav = document.querySelector('.inner-tabs-nav');
    if (!tabNav) return;
    tabNav.addEventListener('click', e => {
      const btn = e.target.closest('.inner-tab-btn');
      if (!btn) return;
      const tabId = btn.dataset.tab;
      tabNav.querySelectorAll('.inner-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('tab-import').classList.toggle('hidden', tabId !== 'import');
      document.getElementById('tab-advanced').classList.toggle('hidden', tabId !== 'advanced');
    });
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
  }

  /* ── Auth ─────────────────────────────────── */
  function renderAuth(state) {
    if (!state) { showView('loading'); return; }
    if (!state.auth || !state.auth.isValid) { showView('auth'); return; }
    showView('main');
    renderMain(state);
  }

  /* ── Store selector ───────────────────────── */
  function renderStore(state) {
    if (!elStoreSelect) return;
    const email = state.auth && state.auth.email;
    if (email) {
      if (!elStoreSelect.querySelector(`option[value="${CSS.escape(email)}"]`)) {
        const opt = document.createElement('option');
        opt.value = email;
        opt.textContent = email;
        elStoreSelect.appendChild(opt);
      }
      elStoreSelect.value = email;
    }
  }

  /* ── eBay warning ─────────────────────────── */
  function renderEbayWarning(state) {
    const needsWarn = state.sync && state.sync.ebaySessionRequired;
    elEbayWarning.classList.toggle('hidden', !needsWarn);
  }

  /* ── Main render ──────────────────────────── */
  function renderMain(state) {
    renderStore(state);
    renderEbayWarning(state);

    const hasProduct = !!(state.product);
    elNoProduct.classList.toggle('hidden', hasProduct);
    elProductTabs.classList.toggle('hidden', !hasProduct);

    if (hasProduct) {
      renderAdvancedEdit(state);
    }
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

  /* ── Get active tab ───────────────────────── */
  function getActiveTab() {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    });
  }

  /* ── Scan product ─────────────────────────── */
  async function doScan() {
    const tab = await getActiveTab();
    if (!tab) { showToast('No active tab found'); return null; }

    if (!tab.url || !tab.url.includes('amazon.')) {
      showToast('Navigate to an Amazon product page first');
      return null;
    }

    return new Promise(resolve => {
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
          resolve(resp.data);
        }
      });
    });
  }

  /* ── Start Import ─────────────────────────── */
  async function doStartImport() {
    if (_importing) return;
    _importing = true;

    btnStartImport.disabled = true;
    btnStartImport.innerHTML = '<span class="btn-spinner"></span> Scanning…';

    try {
      saveSettings();
      const product = await doScan();
      if (!product) { resetImportBtn(); return; }

      // Store to storage → panel-store.onChanged fires → _state.product populated
      await chrome.storage.local.set({ currentProduct: product });
      showToast('Product scanned — review in Advanced Edit tab');

      // Switch to Advanced Edit tab so user sees the result
      const advBtn = document.querySelector('.inner-tab-btn[data-tab="advanced"]');
      if (advBtn) advBtn.click();
    } catch (err) {
      showToast('Scan error: ' + err.message);
    }

    resetImportBtn();
  }

  function resetImportBtn() {
    _importing = false;
    btnStartImport.disabled = false;
    btnStartImport.textContent = 'Start Import';
  }

  /* ── Advanced upload/draft — triggers eBay lister ── */
  async function doAdvancedUpload(asDraft) {
    const product = _state && _state.product;
    if (!product) { showToast('No product loaded — scan first'); return; }

    const btn = asDraft ? btnAdvDraft : btnAdvUpload;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>';

    const finalTitle = (inpTitle.value || product.title || '').trim();
    const images = (product.images || []).filter((_, i) => !_removedImages.has(i));

    // Build the canonical product payload for eBay lister
    const ebayProduct = {
      ...product,
      title: finalTitle,
      images,
      quantity: parseInt(inpAdvQty.value, 10) || 1,
      variations: _variations
    };

    // Persist updated product so panel stays in sync
    await chrome.storage.local.set({ currentProduct: ebayProduct });

    // SW opens eBay tab + stores { [tabId]: { product, isImported: false } }
    chrome.runtime.sendMessage({
      action: 'import_ebay',
      product: ebayProduct,
      uploadType: asDraft ? 'draft' : 'classic'
    });

    showToast(asDraft ? 'Opening eBay draft…' : 'Opening eBay lister…');
    btn.disabled = false;
    btn.textContent = asDraft ? 'Create draft' : 'Upload';
  }

  /* ── Extend — open panel.html tab with current sidebar state ── */
  async function doExtend() {
    const product = _state && _state.product;
    if (!product) { showToast('No product loaded — scan first'); return; }

    const btnExtend = document.getElementById('btn-extend');
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

      const mergedProduct = {
        ...product,
        title: finalTitle,
        images,
        quantity: parseInt(inpAdvQty.value, 10) || 1,
        variations: normalizedVariations
      };

      // Flush to storage, then trigger in-page panel via content script
      await new Promise(resolve => chrome.storage.local.set({
        currentProduct: mergedProduct,
        panelSource: 'sidebar'
      }, resolve));

      const tab = await getActiveTab();
      if (!tab || !tab.id) { showToast('No active tab — navigate to Amazon product page'); return; }

      await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: 'EXTEND_PANEL' }, resp => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Content script not ready'));
          } else {
            resolve(resp);
          }
        });
      });
    } catch (err) {
      showToast('Extend failed: ' + err.message);
    } finally {
      if (btnExtend) { btnExtend.disabled = false; btnExtend.textContent = '⤢ Extend'; }
    }
  }

  function doAdvCancel() {
    inpTitle._dirty = false;
    inpAdvQty._dirty = false;
    advVariations._dirty = false;
    _removedImages.clear();
    if (_state) renderAdvancedEdit(_state);
    showToast('Edits reset');
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

  /* ── eBay warning ─────────────────────────── */
  function initEbayWarning() {
    document.getElementById('btn-warn-dismiss').addEventListener('click', () => {
      chrome.storage.local.set({ ebaySessionRequired: false });
      elEbayWarning.classList.add('hidden');
    });
    document.getElementById('btn-ebay-login').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.ebay.com/signin/' });
    });
    document.getElementById('btn-ebay-hub').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.ebay.com/sh/ovw' });
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
    initInnerTabs();
    initAuthLinks();
    initEbayWarning();
    initDirtyTracking();

    document.getElementById('btn-sign-in').addEventListener('click', doSignIn);
    document.getElementById('btn-log-out').addEventListener('click', doLogOut);

    const btnScanNP = document.getElementById('btn-scan-no-product');
    btnScanNP.addEventListener('click', async () => {
      btnScanNP.disabled = true;
      btnScanNP.innerHTML = '<span class="btn-spinner btn-spinner-sm"></span>';
      await doScan();
      btnScanNP.disabled = false;
      btnScanNP.textContent = 'Scan Product';
    });

    btnStartImport.addEventListener('click', doStartImport);
    [inpMinQty, inpShipping, togLowQty, selUploadType].forEach(el =>
      el.addEventListener('change', saveSettings)
    );

    btnAddDim.addEventListener('click', () => {
      _variations.push({ label: '', values: [''] });
      advVariations._dirty = true;
      renderVariationsEditor();
    });
    btnAdvUpload.addEventListener('click', () => doAdvancedUpload(false));
    btnAdvDraft.addEventListener('click', () => doAdvancedUpload(true));
    btnAdvCancel.addEventListener('click', doAdvCancel);

    const btnExtend = document.getElementById('btn-extend');
    if (btnExtend) btnExtend.addEventListener('click', doExtend);

    window.SSPanelStore.subscribe(state => {
      _state = state;
      renderAuth(state);
    });

    const snap = window.SSPanelStore.getState();
    _state = snap;
    renderAuth(snap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
