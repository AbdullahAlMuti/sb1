// ─────────────────────────────────────────────────────────────────────────────
// ebay_prelist.js — Universal programmatic upload entry point.
// Runs on eBay prelist/sl pages. Checks for a pending product keyed by tabId,
// then hands off to SellerSuitUploader.run() exclusively.
// Old DOM-automation ScenarioManager has been removed.
// ─────────────────────────────────────────────────────────────────────────────

// ─── First-image watermark (Auto-edit) ────────────────────────────────────────
// Same canvas pipeline as the injectors' processImageTo1600x1600: 1600×1600
// white canvas, aspect-fit, watermark bottom-right at 1/4 width. Lives here too
// because the quick-import path never renders a supplier-page gallery — the
// sticker is applied right before SellerSuitUploader.run().

function _ssWatermarkImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const watermark = new Image();
    const sourceImage = new Image();
    sourceImage.crossOrigin = 'Anonymous';

    const watermarkPromise = new Promise((res, rej) => {
      watermark.onload = res;
      watermark.onerror = () => rej(new Error('Failed to load watermark'));
    });
    const sourcePromise = new Promise((res, rej) => {
      sourceImage.onload = res;
      sourceImage.onerror = () => rej(new Error(`Failed to load image: ${imageUrl}`));
    });

    watermark.src = chrome.runtime.getURL('assets/watermark.png');
    sourceImage.src = imageUrl;

    Promise.all([watermarkPromise, sourcePromise]).then(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 1600;
      canvas.height = 1600;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1600, 1600);

      const sourceAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
      let drawWidth, drawHeight, drawX, drawY;
      if (sourceAspect > 1) {
        drawWidth = 1600;
        drawHeight = 1600 / sourceAspect;
        drawX = 0;
        drawY = (1600 - drawHeight) / 2;
      } else {
        drawHeight = 1600;
        drawWidth = 1600 * sourceAspect;
        drawX = (1600 - drawWidth) / 2;
        drawY = 0;
      }
      ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);

      const padding = 20;
      const watermarkWidth = 1600 / 4;
      const watermarkHeight = (watermark.naturalHeight / watermark.naturalWidth) * watermarkWidth;
      ctx.drawImage(watermark, 1600 - watermarkWidth - padding, 1600 - watermarkHeight - padding, watermarkWidth, watermarkHeight);

      resolve(canvas.toDataURL('image/jpeg', 1.0));
    }).catch(reject);
  });
}

// ─── Overlay helpers (used by programmatic upload path) ───────────────────────

function _ssShowOverlay(msg) {
  if (document.getElementById('_ss_upload_overlay')) return;
  const div = document.createElement('div');
  div.id = '_ss_upload_overlay';
  div.setAttribute('superSolid', 'true');
  div.style.cssText = [
    'position:fixed','top:0','left:0','width:100%','height:100%',
    'background:rgba(0,0,0,.55)','z-index:999999',
    'display:flex','align-items:center','justify-content:center',
    'font-family:sans-serif'
  ].join(';');
  div.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:32px 40px;max-width:420px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.25)">
      <div style="font-size:32px;margin-bottom:12px">📦</div>
      <div style="font-size:18px;font-weight:700;color:#1b2444;margin-bottom:8px">SellerSuit</div>
      <div id="_ss_overlay_msg" style="font-size:14px;color:#555;line-height:1.5">${msg}</div>
      <div style="margin-top:16px;height:4px;background:#eee;border-radius:4px;overflow:hidden">
        <div id="_ss_overlay_bar" style="height:100%;background:#3563d6;border-radius:4px;animation:_ss_progress 4s linear infinite"></div>
      </div>
    </div>`;
  const style = document.createElement('style');
  style.textContent = '@keyframes _ss_progress{0%{width:0%}100%{width:100%}}';
  div.appendChild(style);
  document.body.appendChild(div);
}

function _ssUpdateOverlay(msg) {
  const el = document.getElementById('_ss_overlay_msg');
  if (el) el.textContent = msg;
}

function _ssHideOverlay() {
  const el = document.getElementById('_ss_upload_overlay');
  if (el) el.remove();
}

function _ssEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _ssShowError(msg) {
  _ssHideOverlay();
  const div = document.createElement('div');
  div.setAttribute('superSolid', 'true');
  div.style.cssText = [
    'position:fixed','bottom:24px','right:24px','z-index:999999',
    'background:#d32f2f','color:#fff','padding:16px 20px',
    'border-radius:8px','font-family:sans-serif','font-size:13px',
    'max-width:360px','box-shadow:0 4px 16px rgba(0,0,0,.3)'
  ].join(';');
  div.innerHTML = `<strong>SellerSuit upload failed:</strong><br>`;
  div.appendChild(document.createTextNode(msg));
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 12000);
}

// VeRO block modal (1.3) — warns + lets user override with "List anyway".
function _ssShowVeroBlock(matches, onOverride) {
  _ssHideOverlay();
  const brands = matches.map(m => m.brand).join(', ');
  const div = document.createElement('div');
  div.id = '_ss_vero_block';
  div.setAttribute('superSolid', 'true');
  div.style.cssText = [
    'position:fixed','top:0','left:0','width:100%','height:100%',
    'background:rgba(0,0,0,.55)','z-index:999999',
    'display:flex','align-items:center','justify-content:center','font-family:sans-serif'
  ].join(';');
  div.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px 32px;max-width:440px;box-shadow:0 8px 32px rgba(0,0,0,.25)">
      <div style="font-size:32px;margin-bottom:8px">⚠️</div>
      <div style="font-size:18px;font-weight:700;color:#b00020;margin-bottom:10px">VeRO brand risk detected</div>
      <div style="font-size:14px;color:#444;line-height:1.55;margin-bottom:8px">
        This product matches protected brand(s): <strong>${_ssEscapeHtml(brands)}</strong>.
      </div>
      <div style="font-size:13px;color:#777;line-height:1.5;margin-bottom:18px">
        Listing VeRO-protected brands can get your eBay account suspended. Recommended: remove the brand from the title. Only override if you are authorized to sell this brand.
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button id="_ss_vero_cancel" style="padding:9px 16px;border:1px solid #ccc;background:#fff;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">Cancel</button>
        <button id="_ss_vero_override" style="padding:9px 16px;border:none;background:#b00020;color:#fff;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">List anyway</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  div.querySelector('#_ss_vero_cancel').addEventListener('click', () => div.remove());
  div.querySelector('#_ss_vero_override').addEventListener('click', () => {
    div.remove();
    onOverride();
  });
}

// Duplicate block modal (1.2) — warns ASIN already listed, allows re-list.
function _ssShowDuplicateBlock(listing, onOverride) {
  _ssHideOverlay();
  const title = listing?.title ? String(listing.title).slice(0, 80) : 'this product';
  const when  = listing?.created_at ? new Date(listing.created_at).toLocaleDateString() : 'previously';
  const div = document.createElement('div');
  div.id = '_ss_dup_block';
  div.setAttribute('superSolid', 'true');
  div.style.cssText = [
    'position:fixed','top:0','left:0','width:100%','height:100%',
    'background:rgba(0,0,0,.55)','z-index:999999',
    'display:flex','align-items:center','justify-content:center','font-family:sans-serif'
  ].join(';');
  div.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px 32px;max-width:440px;box-shadow:0 8px 32px rgba(0,0,0,.25)">
      <div style="font-size:32px;margin-bottom:8px">🔁</div>
      <div style="font-size:18px;font-weight:700;color:#b8860b;margin-bottom:10px">Already listed</div>
      <div style="font-size:14px;color:#444;line-height:1.55;margin-bottom:8px">
        You already listed <strong>${_ssEscapeHtml(title)}</strong> on ${_ssEscapeHtml(when)}.
      </div>
      <div style="font-size:13px;color:#777;line-height:1.5;margin-bottom:18px">
        Creating another listing for the same product may trigger eBay duplicate-listing policy. Continue only if intentional.
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button id="_ss_dup_cancel" style="padding:9px 16px;border:1px solid #ccc;background:#fff;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">Cancel</button>
        <button id="_ss_dup_override" style="padding:9px 16px;border:none;background:#b8860b;color:#fff;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">List again</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  div.querySelector('#_ss_dup_cancel').addEventListener('click', () => div.remove());
  div.querySelector('#_ss_dup_override').addEventListener('click', () => {
    div.remove();
    onOverride();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-Start: Universal Upload Path
// ─────────────────────────────────────────────────────────────────────────────
(async function() {
    const url = window.location.href;
    const isPrelistPage = url.includes('prelist/home') ||
                          url.includes('prelist') ||
                          url.includes('sr=shListingsTopNav') ||
                          url.includes('s=rshListingsCTA') ||
                          url.includes('/sl/');

    if (!isPrelistPage) return;
    if (!window.SellerSuitUploader || !window.EbayListingApiHelper) return;

    const tabId = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'GET_TAB_ID' }, resp => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(resp?.tabId || null);
      });
    });
    if (!tabId) return;

    const params = new URLSearchParams(window.location.search);
    const uploadSessionId = params.get('uploadSessionId');
    let entry;
    let storageKey;

    if (uploadSessionId) {
      storageKey = uploadSessionId;
      const stored = await chrome.storage.local.get(uploadSessionId);
      entry = stored[uploadSessionId];
    } else {
      storageKey = String(tabId);
      const stored = await chrome.storage.local.get(storageKey);
      entry = stored[storageKey];
    }

    if (!storageKey || !entry?.product || entry.isImported) return;

    console.log('[SS] Universal upload — product found for key', storageKey);

    let productToRun = entry.product;
    if (productToRun.useStoredWatermarkedImages) {
      const sessionStore = await chrome.storage.session.get('watermarkedImages');
      let wm = sessionStore.watermarkedImages || [];
      if (!wm.length) {
        const localStore = await chrome.storage.local.get('watermarkedImages');
        wm = localStore.watermarkedImages || [];
      }
      if (wm.length) {
        const originalImages = [...(productToRun.images || [])];
        productToRun.images = wm;

        if (Array.isArray(productToRun.variants)) {
          productToRun.variants.forEach(v => {
            const imgUrl = v.img || v.image;
            if (imgUrl) {
              const origIdx = originalImages.indexOf(imgUrl);
              if (origIdx !== -1 && wm[origIdx]) {
                v.img = wm[origIdx];
                v.image = wm[origIdx];
              }
            }
          });
        }
      }
    } else {
      // Auto-edit: quick-import path skips the gallery, so the first-image
      // sticker is applied here, right before upload. Supplier-agnostic —
      // works on whatever images the product carries. Failure keeps original.
      const flags = await chrome.storage.local.get(['autoEditEnabled', 'autoWatermarkEnabled']);
      const autoEditOn = flags.autoEditEnabled || flags.autoWatermarkEnabled || false;
      const firstImg = Array.isArray(productToRun.images) ? productToRun.images[0] : null;
      if (autoEditOn && typeof firstImg === 'string' && firstImg.startsWith('http')) {
        try {
          const stamped = await _ssWatermarkImage(firstImg);
          productToRun = { ...productToRun, images: [stamped, ...productToRun.images.slice(1)] };
          console.log('[SS] Auto-edit: watermark applied to first image');
        } catch (e) {
          console.warn('[SS] Auto-edit watermark failed, using original image:', e?.message || e);
        }
      }
    }

    // Bulk Lister mode: the background worker drives this tab and waits for a
    // BULK_ITEM_RESULT keyed by the ORIGINAL uploadSessionId. Stamp it onto the
    // product so the multi-variation bulkedit hop can report against it too.
    const isBulkRun = !!entry.bulkMode;
    if (isBulkRun) {
      productToRun = { ...productToRun, bulkMode: true, __ssBulkSessionId: storageKey };
    }

    function _ssReportBulkResult(result) {
      try {
        chrome.runtime.sendMessage({
          action: 'BULK_ITEM_RESULT',
          uploadSessionId: storageKey,
          ...result
        }, () => { void chrome.runtime.lastError; });
      } catch (_) { /* background unreachable — worker timeout will handle it */ }
    }

    await chrome.storage.local.set({ [storageKey]: { ...entry, product: productToRun, isImported: true } });
    _ssShowOverlay('Preparing your eBay listing…');

    try {
      const _origLog = console.log.bind(console);
      console.log = (...args) => {
        _origLog(...args);
        const msg = args.join(' ');
        if (msg.includes('category'))   _ssUpdateOverlay('Getting category…');
        if (msg.includes('draft'))      _ssUpdateOverlay('Creating listing draft…');
        if (msg.includes('image'))      _ssUpdateOverlay('Uploading product images…');
        if (msg.includes('Navigating')) _ssUpdateOverlay('Done! Redirecting to listing editor…');
      };

      const runResult = await window.SellerSuitUploader.run(productToRun);
      // Non-bulk: run() navigates away on success — execution stops here.
      // Bulk single-variation: run() returns a terminal result instead.
      if (isBulkRun && runResult && runResult.ssBulk) {
        _ssUpdateOverlay('Listed! Moving to the next item…');
        _ssReportBulkResult({
          success: true,
          listingId: runResult.listingId || null,
          variationCount: runResult.variationCount ?? 1,
          draftId: runResult.draftId || null
        });
      }
    } catch (err) {
      console.error('[SS] Upload failed:', err.message || err);

      // Bulk runs are unattended — report the failure (incl. VeRO/duplicate)
      // to the worker instead of showing blocking modals.
      if (isBulkRun) {
        _ssReportBulkResult({ success: false, error: err.message || String(err) });
        _ssShowError(err.message || String(err));
        return;
      }

      if (err.isVeroBlock && Array.isArray(err.veroMatches)) {
        _ssShowVeroBlock(err.veroMatches, async () => {
          _ssShowOverlay('Listing anyway (VeRO override)…');
          try {
            await window.SellerSuitUploader.run({ ...productToRun, forceVeroOverride: true });
          } catch (err2) {
            console.error('[SS] Override upload failed:', err2.message || err2);
            _ssShowError(err2.message || String(err2));
          }
        });
      } else if (err.isDuplicateBlock) {
        _ssShowDuplicateBlock(err.duplicateListing, async () => {
          _ssShowOverlay('Listing duplicate anyway…');
          try {
            await window.SellerSuitUploader.run({ ...productToRun, forceDuplicateOverride: true });
          } catch (err2) {
            console.error('[SS] Override upload failed:', err2.message || err2);
            _ssShowError(err2.message || String(err2));
          }
        });
      } else {
        _ssShowError(err.message || String(err));
      }

      await chrome.storage.local.set({
        [String(tabId)]: { ...entry, uploadError: err.message || String(err) }
      });
    }
})();
