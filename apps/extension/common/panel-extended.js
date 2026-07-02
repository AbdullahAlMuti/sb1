// common/panel-extended.js
// Supplier-agnostic extended panel: showSidebarExtended, _ssxRenderExtended, helpers.
// All data comes from currentProduct in chrome.storage.local — zero page scraping.
// Loaded by every supplier bundle; supplier-specific image processing stays in each injector.

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Robust float cleaning helper for the panel
function _ssxCleanFloat(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

const _SSX_ATTR_PRIORITY = ['color','size','style','pattern','material','capacity','model','pack','flavor','scent'];

function _ssxAttrToString(val) {
    if (val == null) return '';
    if (typeof val === 'object') return val.productName || val.value || val.name || '';
    return String(val);
}

function _ssxVariantDetails(attrs) {
    const entries = Object.entries(attrs || {})
        .map(([k, v]) => [k, _ssxAttrToString(v)])
        .filter(([, v]) => v);
    if (entries.length === 0) return { primary: '—', chips: [] };
    let primaryIdx = -1;
    for (const pri of _SSX_ATTR_PRIORITY) {
        primaryIdx = entries.findIndex(([k]) => k.toLowerCase().includes(pri));
        if (primaryIdx !== -1) break;
    }
    if (primaryIdx === -1) primaryIdx = 0;
    return { primary: entries[primaryIdx][1], chips: entries };
}

function _ssxMoney(n) {
    const v = _ssxCleanFloat(n);
    return '$' + v.toFixed(2);
}

function _ssxText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// Supplier display meta from the adapter registry — single source of truth for
// "Amazon / ASIN", "Walmart / Item ID", etc. Fallback mirrors registry.getMeta
// for contexts where the suppliers bundle failed to load: never throws, renders
// a capitalized name + generic "ID" label for unknown suppliers.
function _ssxSupplierMeta(supplier) {
    if (window.SSSupplierRegistry?.getMeta) return window.SSSupplierRegistry.getMeta(supplier);
    const s = String(supplier || '');
    return {
        displayName: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Supplier',
        idLabel: 'ID'
    };
}
function _ssxImg(id, url) { const el = document.getElementById(id); if (el) { el.src = url || ''; el.style.visibility = url ? 'visible' : 'hidden'; } }

// ─── Save extended editor field values back to storage ────────────────────────

function _saveExtEdits() {
    chrome.storage.local.get(['currentProduct'], result => {
        const p = result.currentProduct || {};
        const et = document.getElementById('ext-title');
        const ep = document.getElementById('ext-price');
        const es = document.getElementById('ext-sku');
        const eq = document.getElementById('ext-qty');
        if (et && et.value) p.title = et.value;
        // ext-price holds the eBay FINAL price (matches _handleSidebarUpload),
        // never the raw supplier price — writing p.price here corrupted margins.
        if (ep && ep.value && _ssxCleanFloat(ep.value) > 0) {
            const newPrice = _ssxCleanFloat(ep.value);
            // Mark manual only on a real change — _saveExtEdits also fires from
            // title/qty/spec edits while ext-price still holds the prefill.
            if (newPrice !== _ssxCleanFloat(p.finalPrice)) p.price_source = 'manual';
            p.finalPrice = newPrice;
        }
        if (es && es.value) p.ebaySku = es.value;
        if (eq && eq.value) p.quantity = parseInt(eq.value, 10) || 1;
        document.querySelectorAll('#ext-specs input[data-spec-key]').forEach(inp => {
            if (!p.specs) p.specs = {};
            p.specs[inp.dataset.specKey] = inp.value;
        });
        chrome.storage.local.set({ currentProduct: p });
    });
}

// ─── Upload from extended editor ──────────────────────────────────────────────

async function _handleSidebarUpload() {
    const btn = document.getElementById('opti-list-btn') || document.querySelector('[id="opti-list-btn"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }
    try {
        _saveExtEdits();
        await new Promise(r => setTimeout(r, 80));

        let draft = null;
        if (typeof window.SSListingDraft !== 'undefined') {
            draft = await window.SSListingDraft.getDraft();
        }

        const result = await chrome.storage.local.get([
            'currentProduct', 'selectedEbayTitle', 'selectedEbayDescription',
            'generatedAt', 'selectedDescriptionTimestamp'
        ]);
        const p = result.currentProduct || {};
        // Stale guard: stored AI title/description from a previously scanned
        // product must not leak onto this one.
        const scannedAt = p.lastScannedAt || p.scrapedAt || 0;
        const storedTitleFresh = !scannedAt || (result.generatedAt || 0) >= scannedAt;
        const storedDescFresh = !scannedAt || (result.selectedDescriptionTimestamp || 0) >= scannedAt;

        // ext-title is prefilled with the scraped title at panel open, so its
        // value only counts as a manual edit when it differs from the original.
        const scrapedTitle = (p.title || '').trim();
        const extTitleRaw = document.getElementById('ext-title')?.value?.trim() || '';
        const extTitle = extTitleRaw && extTitleRaw !== scrapedTitle ? extTitleRaw : '';
        // The AI title box is contenteditable — read it directly so a generated
        // (or hand-tweaked) title wins over the stale scraped one.
        const aiTitleText = document.getElementById('ai-generated-title')?.textContent?.trim() || '';
        const aiTitle = (aiTitleText && !aiTitleText.startsWith('Click AI Generate') && aiTitleText !== scrapedTitle)
            ? aiTitleText : '';
        const draftTitle = draft && draft.title;
        const storedAiTitle = storedTitleFresh ? (result.selectedEbayTitle || '') : '';
        const finalTitle = extTitle || aiTitle || draftTitle || storedAiTitle || scrapedTitle || '';
        const titleSource = extTitle ? 'manual'
            : aiTitle || (!draftTitle && storedAiTitle) ? 'ai'
            : draftTitle ? (draft.title_source || 'scraped')
            : 'scraped';

        // Precedence: live field > edited/stored product > draft. The draft is
        // frozen at scan time (panel edits never patch it), so letting draftSku
        // win resurrected the auto-generated SKU over the user's edit.
        const extSku = document.getElementById('ext-sku')?.value?.trim();
        const draftSku = draft && draft.sku;
        const sku = extSku || p.ebaySku || draftSku || '';
        const skuSource = extSku ? 'manual'
            : p.ebaySku ? (p.sku_source || 'generated')
            : draftSku ? (draft.sku_source || 'generated')
            : 'generated';

        // Precedence: live field > stored product > scan-time draft (draft is
        // never patched by panel edits, so it must not outrank them).
        const extPriceStr = document.getElementById('ext-price')?.value?.trim();
        const extPrice = _ssxCleanFloat(extPriceStr) || 0;
        const storedPrice = _ssxCleanFloat(p.finalPrice) || 0;
        const draftFinalPrice = (draft && draft.pricing && _ssxCleanFloat(draft.pricing.finalPrice)) || 0;
        const finalPrice = extPrice > 0 ? extPrice : (storedPrice || draftFinalPrice || 0);
        // ext-price is prefilled with the stored price, so its presence alone is
        // not a manual edit — only a value differing from storage is.
        const priceSource = (extPrice > 0 && extPrice !== storedPrice) ? 'manual'
            : (p.price_source
                || (draftFinalPrice ? (draft.price_source || 'calculated') : 'calculated'));

        // AI description is stored under selectedEbayDescription by the
        // description generator. Prefer a fresh generated description over the
        // scan-time draft, otherwise uploads can silently use scraped copy.
        const aiDescription = storedDescFresh ? (result.selectedEbayDescription || '') : '';
        const description = aiDescription || (draft && draft.description) || p.description || '';
        const descSource = aiDescription ? 'ai'
            : (draft && draft.description) ? (draft.description_source || 'scraped')
            : 'scraped';

        // currentProduct.images is canonical (carries edited/deleted images);
        // the scan-time draft is the fallback only. Draft used to win here,
        // which uploaded the original scraped images over the edited ones.
        const images = (Array.isArray(p.images) && p.images.length > 0)
            ? p.images
            : ((draft && draft.images) || []);

        console.log('[SS Upload] title_source:', titleSource, '| title:', finalTitle.slice(0, 60));
        console.log('[SS Upload] price_source:', priceSource, '| finalPrice:', finalPrice);
        console.log('[SS Upload] sku_source:', skuSource, '| sku:', sku);
        console.log('[SS Upload] description_source:', descSource, '| desc length:', description.length);
        console.log('[SS Upload] images count:', images.length);

        if (!finalTitle) { alert('No title set. Fill title first.'); if (btn) { btn.disabled = false; btn.textContent = 'Upload'; } return; }
        if (!sku) { alert('No SKU. Fill SKU first.'); if (btn) { btn.disabled = false; btn.textContent = 'Upload'; } return; }
        if (finalPrice <= 0) {
            console.warn('[SS Upload] finalPrice is 0 — raw price may not have been calculated yet');
        }

        const uploadProduct = {
            ...p,
            title: finalTitle,
            description,
            images,
            ebaySku: sku,
            supplierPrice: _ssxCleanFloat(p.price) || 0,
            ebayFinalPrice: finalPrice || _ssxCleanFloat(p.finalPrice) || 0,
            finalPrice: finalPrice || p.finalPrice || 0,
            price_source: priceSource,
            title_source: titleSource,
            description_source: descSource,
            sku_source: skuSource,
            useStoredWatermarkedImages: false
        };

        if (Array.isArray(p.variants)) {
            uploadProduct.variants = p.variants.map(v => ({
                ...v,
                supplierPrice: _ssxCleanFloat(v.price) || 0,
                ebayFinalPrice: _ssxCleanFloat(v.ebayPrice) || _ssxCleanFloat(v.finalPrice) || 0
            }));
        }

        chrome.runtime.sendMessage({
            action: 'import_ebay',
            product: uploadProduct,
            uploadType: 'classic'
        });
        if (btn) btn.textContent = '✅ Opening eBay…';
        setTimeout(() => { if (btn) { btn.disabled = false; btn.textContent = 'Upload'; } }, 3000);
    } catch (err) {
        console.error('[SidebarUpload] error:', err);
        if (btn) { btn.disabled = false; btn.textContent = 'Upload'; }
    }
}

// ─── Variant rows ─────────────────────────────────────────────────────────────

function _ssxRenderVariantRows(variants, p) {
    const tbody = document.getElementById('ssx-var-rows');
    if (!tbody) return;
    tbody.innerHTML = '';
    variants.forEach(v => {
        const det = _ssxVariantDetails(v.attrs);
        const supplier = _ssxCleanFloat(v.raw_supplier_price ?? v.price) || 0;
        const ebay = _ssxCleanFloat(v.finalPrice) || 0;
        const profit = ebay - supplier;
        const profitPct = supplier > 0 ? (profit / supplier * 100) : 0;
        const stock = v.quantity != null ? v.quantity : 1;
        const _skuParent = p.sourceId || p.parentAsin || p.asin || p.productId || '';
        const sku = v.sku || v.ebaySku || (window.SSSkuEngine
            ? window.SSSkuEngine.buildReadable(_skuParent, v.attrs, window.SSSkuEngine.prefixFor && window.SSSkuEngine.prefixFor(p.supplier))
            : (_skuParent + (Object.values(v.attrs || {}).map(a => (a && typeof a === 'object' ? a.productName : a) || '').join('-') || '') || '—'));

        const tr = document.createElement('tr');

        const tdImg = document.createElement('td');
        const img = document.createElement('img');
        img.className = 'ssx-row-img';
        img.src = v.img || (Array.isArray(p.images) ? p.images[0] : '') || '';
        img.alt = det.primary;
        img.onerror = () => { img.style.visibility = 'hidden'; };
        tdImg.appendChild(img);

        const tdDet = document.createElement('td');
        const wrap = document.createElement('div');
        wrap.className = 'ssx-vd';
        const prim = document.createElement('span');
        prim.className = 'ssx-vd-primary';
        prim.textContent = det.primary;
        wrap.appendChild(prim);
        det.chips.forEach(([k, val]) => {
            const chip = document.createElement('span');
            chip.className = 'ssx-vd-chip';
            chip.textContent = `${k}: ${val}`;
            wrap.appendChild(chip);
        });
        tdDet.appendChild(wrap);

        const tdSup = document.createElement('td');
        tdSup.className = 'ssx-cell-price';
        tdSup.textContent = _ssxMoney(supplier);

        const tdEbay = document.createElement('td');
        tdEbay.className = 'ssx-cell-ebay';
        const ebayInp = document.createElement('input');
        ebayInp.type = 'text';
        ebayInp.inputMode = 'decimal';
        ebayInp.value = ebay ? ebay.toFixed(2) : '';

        const tdProfit = document.createElement('td');
        tdProfit.className = 'ssx-cell-profit';
        tdProfit.textContent = `${_ssxMoney(profit)} (${profitPct.toFixed(1)}%)`;

        ebayInp.addEventListener('input', () => {
            const val = _ssxCleanFloat(ebayInp.value) || 0;
            // Stamp both: adaptProduct reads v.ebayPrice before v.finalPrice,
            // so an edit must win over any earlier auto-stamped ebayPrice.
            v.finalPrice = val;
            v.ebayPrice = val;
            const pr = val - supplier;
            const prPct = supplier > 0 ? (pr / supplier * 100) : 0;
            tdProfit.textContent = `${_ssxMoney(pr)} (${prPct.toFixed(1)}%)`;
            chrome.storage.local.set({ currentProduct: p });
        });
        tdEbay.appendChild(ebayInp);

        const tdSku = document.createElement('td');
        tdSku.className = 'ssx-cell-sku';
        const skuInp = document.createElement('input');
        skuInp.type = 'text';
        skuInp.maxLength = 50;
        skuInp.spellcheck = false;
        skuInp.value = sku;
        skuInp.addEventListener('input', () => {
            v.sku = skuInp.value.trim();
            chrome.storage.local.set({ currentProduct: p });
        });
        tdSku.appendChild(skuInp);

        const tdStock = document.createElement('td');
        tdStock.textContent = String(stock);

        const tdStatus = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'ssx-status-ready';
        badge.textContent = 'Ready';
        tdStatus.appendChild(badge);

        // Delete variation — removes from storage, upload payload, and dashboard
        // sync (all three read currentProduct.variants).
        const tdDel = document.createElement('td');
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'ssx-var-del';
        delBtn.title = 'Delete this variation';
        delBtn.setAttribute('aria-label', 'Delete variation');
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
            const idx = p.variants.indexOf(v);
            if (idx === -1) return;
            p.variants.splice(idx, 1);
            p.hasVariants = p.variants.length > 1;
            chrome.storage.local.set({ currentProduct: p }, () => {
                _ssxRenderVariantRows(p.variants, p);
                _ssxText('ssx-var-count', `(${p.variants.length})`);
                if (window.UIHelper?.showToast) window.UIHelper.showToast('Variation removed', 'success');
            });
        });
        tdDel.appendChild(delBtn);

        tr.append(tdImg, tdDet, tdSup, tdEbay, tdProfit, tdSku, tdStock, tdStatus, tdDel);
        tbody.appendChild(tr);
    });
}

// ─── Reference-layout renderer (UI only — reuses live nodes/handlers) ─────────

async function _ssxRenderExtended(p) {
    if (!p) return;
    const variants = Array.isArray(p.variants) ? p.variants : [];

    let variantsUpdated = false;
    const skuParentId = p.sourceId || p.parentAsin || p.asin || p.productId || '';
    const skuPrefix = window.SSSkuEngine?.prefixFor ? window.SSSkuEngine.prefixFor(p.supplier) : 'AMZ';
    variants.forEach(v => {
        if (!v.sku && v.attrs) {
            v.sku = window.SSSkuEngine
                ? window.SSSkuEngine.buildReadable(skuParentId, v.attrs, skuPrefix)
                : (skuParentId + (Object.values(v.attrs || {}).map(a => a?.productName || '').join('-') || ''));
            variantsUpdated = true;
        }
    });
    // Single products: auto-generate the SKU once so the panel always shows an
    // editable value and upload never falls back to an empty SKU.
    if (!p.ebaySku && variants.length <= 1 && skuParentId && window.SSSkuEngine) {
        p.ebaySku = window.SSSkuEngine.buildReadable(skuParentId, {}, skuPrefix);
        variantsUpdated = true;
    }
    // Auto-calculate missing eBay prices (universal — same engine + defaults for
    // every supplier). Injectors stamp finalPrice at scan time on the Amazon
    // path; Walmart and future suppliers land here without it.
    if (window.SSPricingEngine) {
        const storedCalc = await new Promise(r => chrome.storage.local.get('calculatorValues', r));
        const calcVals = storedCalc.calculatorValues || {};
        const parseVal = (v, def) => {
            if (v === null || v === undefined || v === '') return def;
            const cleaned = String(v).replace(/[^\d.-]/g, '');
            const n = parseFloat(cleaned);
            return isNaN(n) ? def : n;
        };
        const pricingConfig = {
            taxPercent:      parseVal(calcVals['tax-percent'],       9),
            trackingFee:     parseVal(calcVals['tracking-fee'],      0.20),
            ebayFeePercent:  parseVal(calcVals['ebay-fee-percent'],  20),
            promoFeePercent: parseVal(calcVals['promo-fee-percent'], 10),
            desiredProfit:   parseVal(calcVals['desired-profit'],    0),
            paymentFixedFee: parseVal(calcVals['payment-fixed-fee'], 0.30)
        };

        variants.forEach(v => {
            const rawCost = _ssxCleanFloat(v.raw_supplier_price ?? v.price);
            if (!_ssxCleanFloat(v.finalPrice) && rawCost > 0) {
                v.finalPrice = window.SSPricingEngine.calculatePrice(rawCost, pricingConfig);
                if (!_ssxCleanFloat(v.ebayPrice)) v.ebayPrice = v.finalPrice;
                variantsUpdated = true;
            }
        });
        const baseCost = _ssxCleanFloat(p.raw_supplier_price ?? p.price);
        if (!_ssxCleanFloat(p.finalPrice) && baseCost > 0) {
            p.finalPrice = window.SSPricingEngine.calculatePrice(baseCost, pricingConfig);
            variantsUpdated = true;
        }
    }
    if (variantsUpdated) {
        chrome.storage.local.set({ currentProduct: p });
    }

    const images = Array.isArray(p.images) ? p.images : [];
    const mainImg = images[0] || (variants[0] && variants[0].img) || p.mainImage || '';
    const productId = p.sourceId || p.asin || p.parentAsin || p.productId || '';
    const isSingle = p.isSingleMode || p.mode === 'single' || variants.length <= 1;
    const supplierMeta = _ssxSupplierMeta(p.supplier);

    _ssxImg('ssx-head-img', mainImg);
    _ssxText('ssx-head-title', p.title || 'Product');
    const supplierChip = document.getElementById('ssx-head-supplier');
    if (supplierChip) {
        const logo = supplierChip.querySelector('img, svg');
        supplierChip.textContent = '';
        if (logo) supplierChip.appendChild(logo);
        supplierChip.appendChild(document.createTextNode(supplierMeta.displayName));
    }
    _ssxText('ssx-head-asin', `${supplierMeta.idLabel}: ${productId || '—'}`);

    _ssxImg('ssx-sum-img', mainImg);
    _ssxText('ssx-sum-asin', productId || '—');
    _ssxText('ssx-sum-condition', p.condition || 'New');
    _ssxText('ssx-sum-varcount', String(variants.length));

    const supplierPrices = variants.map(v => _ssxCleanFloat(v.raw_supplier_price ?? v.price)).filter(n => !isNaN(n));
    const ebayPrices     = variants.map(v => _ssxCleanFloat(v.finalPrice)).filter(n => !isNaN(n));
    const stocks         = variants.map(v => parseInt(v.quantity, 10)).filter(n => !isNaN(n));
    const baseSupplier   = _ssxCleanFloat(p.raw_supplier_price ?? p.price) || (supplierPrices[0] || 0);
    const baseEbay       = _ssxCleanFloat(p.finalPrice) || (ebayPrices[0] || 0);
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const avgSupplier = supplierPrices.length ? avg(supplierPrices) : baseSupplier;
    const avgEbay     = ebayPrices.length ? avg(ebayPrices) : baseEbay;
    const avgProfit   = avgEbay - avgSupplier;
    const avgProfitPct = avgSupplier > 0 ? (avgProfit / avgSupplier * 100) : 0;
    const totalStock  = stocks.length ? stocks.reduce((a, b) => a + b, 0) : (parseInt(p.quantity, 10) || 0);

    _ssxText('ssx-stat-supplier', _ssxMoney(avgSupplier));
    _ssxText('ssx-stat-ebay', _ssxMoney(avgEbay));
    _ssxText('ssx-stat-profit', `${_ssxMoney(avgProfit)} (${avgProfitPct.toFixed(1)}%)`);
    _ssxText('ssx-stat-stock', String(totalStock));
    _ssxText('ssx-stat-varcount', String(variants.length));

    const moveNode = (nodeId, mountId) => {
        const node = document.getElementById(nodeId);
        const mount = document.getElementById(mountId);
        if (node && mount && node.parentElement !== mount) mount.appendChild(node);
    };
    moveNode('ai-title-container', 'ssx-title-mount');
    moveNode('description-preview', 'ssx-desc-mount');
    moveNode('snipe-image-gallery', 'ssx-gallery-mount');

    const singleBlock = document.getElementById('ssx-single-block');
    const varBlock = document.getElementById('ssx-var-block');

    function applyModeView(mode) {
        const single = mode === 'single';
        if (singleBlock) singleBlock.style.display = single ? 'block' : 'none';
        if (varBlock) varBlock.style.display = single ? 'none' : 'block';
        document.querySelectorAll('#ssx-mode-seg .ssx-mode-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.mode === mode));
    }

    if (isSingle) {
        const v0 = variants[0] || {};
        const singleCost = _ssxCleanFloat(v0.raw_supplier_price ?? v0.price ?? baseSupplier) || 0;
        _ssxText('ssx-single-supplier', _ssxMoney(singleCost));
        const ebayEl = document.getElementById('ssx-single-ebay');
        const singleEbay = _ssxCleanFloat(v0.finalPrice ?? baseEbay) || 0;
        if (ebayEl && ebayEl.tagName === 'INPUT') {
            ebayEl.value = singleEbay ? singleEbay.toFixed(2) : '';
            if (!ebayEl._ssxBound) {
                ebayEl._ssxBound = true;
                ebayEl.addEventListener('input', () => {
                    const val = _ssxCleanFloat(ebayEl.value) || 0;
                    const extPrice = document.getElementById('ext-price');
                    if (extPrice) extPrice.value = ebayEl.value.trim();
                    _ssxText('ssx-single-profit', _ssxMoney(val - singleCost));
                    _saveExtEdits();
                });
            }
        } else if (ebayEl) {
            ebayEl.textContent = _ssxMoney(singleEbay);
        }
        const sProfit = singleEbay - singleCost;
        _ssxText('ssx-single-profit', _ssxMoney(sProfit));
        const skuEl = document.getElementById('ssx-single-sku');
        if (skuEl) {
            const skuVal = p.ebaySku || v0.sku || '';
            if ('value' in skuEl && skuEl.tagName === 'INPUT') {
                skuEl.value = skuVal;
                const extSkuFld = document.getElementById('ext-sku');
                if (extSkuFld && !extSkuFld.value && skuVal) extSkuFld.value = skuVal;
                if (!skuEl._ssxBound) {
                    skuEl._ssxBound = true;
                    skuEl.addEventListener('input', () => {
                        const extSku = document.getElementById('ext-sku');
                        if (extSku) extSku.value = skuEl.value.trim();
                        _saveExtEdits();
                    });
                }
            } else {
                skuEl.textContent = skuVal || '—';
            }
        }
        _ssxText('ssx-single-stock', `${v0.quantity || p.quantity || 1} · Ready`);
    } else {
        _ssxRenderVariantRows(variants, p);
    }
    _ssxText('ssx-var-count', `(${variants.length})`);
    applyModeView(isSingle ? 'single' : 'all');

    document.querySelectorAll('#ssx-mode-seg .ssx-mode-btn').forEach(btn => {
        if (btn._ssxBound) return;
        btn._ssxBound = true;
        btn.addEventListener('click', () => applyModeView(btn.dataset.mode));
    });

    const bindClick = (newId, targetId) => {
        const nb = document.getElementById(newId);
        const tgt = document.getElementById(targetId);
        if (nb && tgt && !nb._ssxBound) { nb._ssxBound = true; nb.addEventListener('click', () => tgt.click()); }
    };
    bindClick('ssx-ai-title-btn', 'generate-ai-titles-btn');
    bindClick('ssx-ai-desc-btn', 'generate-description-btn');

    // Auto-edit toggle — shared top-level storage key with the side panel.
    const autoEditCb = document.getElementById('ssx-autoedit-toggle');
    if (autoEditCb && !autoEditCb._ssxBound) {
        autoEditCb._ssxBound = true;
        chrome.storage.local.get('autoEditEnabled', d => { autoEditCb.checked = !!d.autoEditEnabled; });
        autoEditCb.addEventListener('change', () => {
            chrome.storage.local.set({ autoEditEnabled: autoEditCb.checked });
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.autoEditEnabled) {
                autoEditCb.checked = !!changes.autoEditEnabled.newValue;
            }
        });
    }

    ['ssx-upload-top', 'ssx-upload-bot'].forEach(id => {
        const b = document.getElementById(id);
        if (b && !b._ssxBound) { b._ssxBound = true; b.addEventListener('click', _handleSidebarUpload); }
    });
    ['ssx-save-draft-top', 'ssx-save-draft-bot'].forEach(id => {
        const b = document.getElementById(id);
        if (b && !b._ssxBound) { b._ssxBound = true; b.addEventListener('click', () => { _saveExtEdits(); if (window.UIHelper?.showToast) window.UIHelper.showToast('Draft saved', 'success'); }); }
    });
    ['ssx-preview-top', 'ssx-preview-bot'].forEach(id => {
        const b = document.getElementById(id);
        if (b && !b._ssxBound) { b._ssxBound = true; b.addEventListener('click', () => { const sp = document.getElementById('scrape-preview-btn'); if (sp) sp.click(); }); }
    });
    const cancelBtn = document.getElementById('ssx-cancel-btn');
    if (cancelBtn && !cancelBtn._ssxBound) { cancelBtn._ssxBound = true; cancelBtn.addEventListener('click', () => { const cb = document.getElementById('panel-close-btn'); if (cb) cb.click(); }); }
    const backBtn = document.getElementById('ssx-back-btn');
    if (backBtn && !backBtn._ssxBound) { backBtn._ssxBound = true; backBtn.addEventListener('click', () => { const cb = document.getElementById('panel-close-btn'); if (cb) cb.click(); }); }
    const copyIdBtn = document.getElementById('ssx-copy-asin');
    if (copyIdBtn && !copyIdBtn._ssxBound) { copyIdBtn._ssxBound = true; copyIdBtn.addEventListener('click', () => { if (productId) navigator.clipboard?.writeText(productId); }); }
}

// ─── Main entry: show extended editor from sidebar state ──────────────────────

// opts.force — render whenever currentProduct exists, regardless of panelSource.
// Used by the standalone panel.html tab (universal editor); the inline-injected
// path keeps the panelSource === 'sidebar' guard.
async function showSidebarExtended(opts = {}) {
    const d = await chrome.storage.local.get(['currentProduct', 'panelSource']);
    if (!d.currentProduct) return;
    if (opts.force !== true && d.panelSource !== 'sidebar') return;
    const p = d.currentProduct;

    const wrap = document.getElementById('ss-extended-editor');
    if (!wrap) { console.warn('[showSidebarExtended] #ss-extended-editor not in DOM'); return; }
    wrap.style.display = 'block';

    const shell = document.querySelector('.ss-panel-shell');
    if (shell) shell.classList.add('ssx-active');
    ['ss-header', 'snipe-main-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    ['.ss-image-overview', '.ss-action-bar.bottom-action-toolbar'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.style.display = 'none';
    });

    const fld = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    fld('ext-title', p.title);
    fld('ext-price', p.finalPrice); // eBay final price — NOT supplier price (upload reads this as final)
    fld('ext-sku',   p.ebaySku);
    fld('ext-qty',   p.quantity || 1);

    const mainTitle = document.getElementById('ai-generated-title');
    if (mainTitle && p.title) { mainTitle.textContent = p.title; }

    // Load and populate saved description
    const descDisplay = document.getElementById('description-preview');
    if (descDisplay) {
        chrome.storage.local.get([
            'selectedEbayDescription', 
            'generatedDescription', 
            'selectedDescriptionTimestamp'
        ], async (result) => {
            let draft = null;
            if (window.SSListingDraft) {
                try {
                    draft = await window.SSListingDraft.getDraft();
                } catch (e) {
                    console.warn('[showSidebarExtended] Failed to get draft:', e);
                }
            }
            
            const scannedAt = p.lastScannedAt || p.scrapedAt || 0;
            const storedDescFresh = !scannedAt || (result.selectedDescriptionTimestamp || 0) >= scannedAt;
            const aiDescription = storedDescFresh ? (result.selectedEbayDescription || result.generatedDescription || '') : '';
            const description = aiDescription || (draft && draft.description) || p.description || '';
            
            if (description) {
                descDisplay.innerHTML = description;
                descDisplay.classList.remove('description-empty-state');
                
                const copyBtn = document.getElementById('copy-description-btn');
                if (copyBtn) {
                    copyBtn.disabled = false;
                    copyBtn.style.display = 'inline-flex';
                }
                
                const descCounter = document.querySelector('.ss-desc-counter');
                if (descCounter) {
                    const currentText = descDisplay.innerText || '';
                    descCounter.innerHTML = `${currentText.length} / 5000 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 12px; height: 12px; color: #22c55e;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                }
            } else {
                if (!descDisplay.querySelector('.description-placeholder')) {
                    descDisplay.innerHTML = `
                        <div class="ss-desc-empty description-placeholder description-empty-state" contenteditable="false">
                          <svg class="ss-empty-icon" viewBox="0 0 24 24" fill="none" stroke="var(--ss-green)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                          <h4 class="ss-empty-title">No description yet</h4>
                          <p class="ss-empty-subtitle">Click AI Write Description to generate.</p>
                        </div>
                    `;
                }
                const descCounter = document.querySelector('.ss-desc-counter');
                if (descCounter) {
                    descCounter.innerHTML = `0 / 5000 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 12px; height: 12px; color: #22c55e;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                }
                const copyBtn = document.getElementById('copy-description-btn');
                if (copyBtn) {
                    copyBtn.disabled = true;
                    copyBtn.style.display = 'none';
                }
            }
        });
    }

    const variations = p.variations || [];
    const varWrap = document.getElementById('ext-variations-wrap');
    const varContainer = document.getElementById('ext-variations');
    if (variations.length > 0 && varWrap && varContainer) {
        varWrap.style.display = 'block';
        varContainer.innerHTML = '';
        variations.forEach(dim => {
            const dimEl = document.createElement('div');
            dimEl.style.cssText = 'margin-bottom:8px;';
            const hdr = document.createElement('div');
            hdr.style.cssText = 'font-size:11px;color:var(--ss-muted,#94a3b8);margin-bottom:4px;font-weight:600;';
            hdr.textContent = dim.label || '';
            dimEl.appendChild(hdr);
            const chips = document.createElement('div');
            chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
            (dim.values || []).forEach(val => {
                const chip = document.createElement('span');
                chip.textContent = val;
                const isSelected = p.selectedVariation &&
                    Object.values(p.selectedVariation).some(v => String(v).toLowerCase() === String(val).toLowerCase());
                chip.style.cssText = `padding:2px 10px;border-radius:12px;font-size:11px;border:1px solid ${isSelected ? 'var(--ss-green,#22c55e)' : 'var(--ss-border,#334155)'};background:var(--ss-bg,#0f172a);color:${isSelected ? 'var(--ss-green,#22c55e)' : 'var(--ss-muted,#94a3b8)'};`;
                chips.appendChild(chip);
            });
            dimEl.appendChild(chips);
            varContainer.appendChild(dimEl);
        });
    }

    const specs = p.specs || p.specifications || {};
    const specKeys = Object.keys(specs);
    const specWrap = document.getElementById('ext-specs-wrap');
    const specContainer = document.getElementById('ext-specs');
    if (specKeys.length > 0 && specWrap && specContainer) {
        specWrap.style.display = 'block';
        specContainer.innerHTML = '';

        const details = document.createElement('details');
        details.style.cssText = 'border:1px solid var(--ss-border,#334155);border-radius:6px;overflow:hidden;';

        const summary = document.createElement('summary');
        summary.style.cssText = 'padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;color:var(--ss-muted,#94a3b8);list-style:none;display:flex;align-items:center;gap:6px;user-select:none;';
        summary.innerHTML = `<span style="font-size:10px;transition:transform 0.2s;" class="ext-specs-arrow">▶</span> Item Specifics <span style="font-size:10px;opacity:0.6;">(${specKeys.length})</span>`;
        details.addEventListener('toggle', () => {
            const arrow = details.querySelector('.ext-specs-arrow');
            if (arrow) arrow.style.transform = details.open ? 'rotate(90deg)' : 'rotate(0deg)';
        });

        const body = document.createElement('div');
        body.style.cssText = 'padding:8px 10px;display:flex;flex-direction:column;gap:4px;';

        specKeys.forEach(key => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:8px;align-items:center;';
            const lbl = document.createElement('span');
            lbl.textContent = key;
            lbl.style.cssText = 'flex:0 0 130px;font-size:11px;color:var(--ss-muted,#94a3b8);';
            const inp = document.createElement('input');
            inp.type = 'text'; inp.value = specs[key] || '';
            inp.dataset.specKey = key;
            inp.style.cssText = 'flex:1;padding:4px 6px;border-radius:4px;border:1px solid var(--ss-border,#334155);background:var(--ss-bg,#0f172a);color:inherit;font-size:12px;';
            inp.addEventListener('input', _saveExtEdits);
            row.appendChild(lbl); row.appendChild(inp);
            body.appendChild(row);
        });

        details.appendChild(summary);
        details.appendChild(body);
        specContainer.appendChild(details);
    }

    ['ext-title','ext-price','ext-sku','ext-qty'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', _saveExtEdits);
    });
    const extTitle = document.getElementById('ext-title');
    if (extTitle && mainTitle) {
        extTitle.addEventListener('input', () => { mainTitle.textContent = extTitle.value; });
    }

    const origBtn = document.getElementById('opti-list-btn');
    if (origBtn) {
        const newBtn = origBtn.cloneNode(true);
        newBtn.textContent = 'Upload';
        origBtn.parentNode.replaceChild(newBtn, origBtn);
        newBtn.addEventListener('click', _handleSidebarUpload);
    }

    await _ssxRenderExtended(p);
}

// Explicit window exposure. Required: the bundler treeshakes side-effect-free
// modules out of the content-script bundles even with treeshake disabled —
// without these assignments the whole file is dropped and the injectors'
// showSidebarExtended() calls throw ReferenceError. Also lets panel.html
// (classic script context) and the injectors share one definition.
window.showSidebarExtended = showSidebarExtended;
window._ssxRenderExtended = _ssxRenderExtended;
window._saveExtEdits = _saveExtEdits;
window._handleSidebarUpload = _handleSidebarUpload;
