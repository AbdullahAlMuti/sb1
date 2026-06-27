// SuperDS ebay.ts port — vanilla JS, eBay item page scraper
// Runs on: *.ebay.com/itm/* pages
// Features: steal item specifics, read images/specs

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ── Steal specifics from eBay item page (SuperDS B() function) ──────────────
function stealItemSpecifics() {
  const result = {};
  const skip = ['condition', 'upc', 'mpn'];
  document.querySelectorAll('.ux-layout-section-evo__row').forEach(row => {
    row.querySelectorAll('dl').forEach(dl => {
      const labelEl = dl.querySelector('.ux-labels-values__labels-content div');
      const valueEl = dl.querySelector('.ux-labels-values__values-content div');
      if (!labelEl || !valueEl) return;
      const label = labelEl.textContent.trim();
      const value = valueEl.textContent.trim();
      if (!label || !value) return;
      if (skip.includes(label.toLowerCase())) return;
      result[label] = value;
    });
  });
  return result;
}

// Alternate scrape: row-based labels (SuperDS secondary method)
function stealSpecsAlt() {
  const result = {};
  const skip = ['condition', 'upc', 'mpn'];
  document.querySelectorAll('div .ux-labels-values__labels:not(.col-6):not(.col-3)').forEach(labelEl => {
    try {
      let label = labelEl.textContent.trim();
      if (label.endsWith(':')) label = label.slice(0, -1);
      const valueEl = labelEl.nextElementSibling;
      const value = valueEl ? valueEl.textContent.trim() : '';
      if (!label || !value) return;
      if (skip.includes(label.toLowerCase())) return;
      result[label] = value;
    } catch (_) {}
  });
  return result;
}

// ── Get product images (SuperDS getProductImages() port) ────────────────────
async function getProductImages() {
  const seen = new Set();
  const images = [];
  const clean = url => {
    if (!url) return null;
    return url.replace(/(\d+)\.(jpg|png|jpeg|webp)/i, '1600.$2');
  };
  const add = url => {
    const c = clean(url);
    if (c && !seen.has(c)) { seen.add(c); images.push(c); }
  };
  const collect = () => {
    let btns = document.querySelectorAll('button[class*="image"] img');
    if (!btns.length) btns = document.querySelectorAll('div[class*="ux-image-carousel"] img');
    btns.forEach(img => add(img.dataset.src || img.src));
  };
  // Scroll filmstrip
  const strip = document.querySelector('[class*="ux-image-carousel"], [class*="image-carousel"], [class*="filmstrip"]');
  if (strip) {
    for (let i = 0; i < 10; i++) { strip.scrollBy({ left: 240, behavior: 'auto' }); await wait(150); collect(); }
  }
  // Click next buttons
  const nextBtn = document.querySelector('button.btn-grid-nav.btn-next[aria-label*="Next image"]');
  if (nextBtn) {
    for (let i = 0; i < 12; i++) { nextBtn.click(); await wait(150); collect(); }
  }
  collect();
  return images;
}

// ── Inject "Steal Item Specifics" button (SuperDS v/w/g selectors) ──────────
const STEAL_BTN_ID = 'ss-stealButton';
const BUY_BOX_SELECTOR = '.vim [data-testid="x-buybox-cta"]';

function injectStealButton() {
  if (document.getElementById(STEAL_BTN_ID)) return true;
  const anchor = document.querySelector(BUY_BOX_SELECTOR);
  if (!anchor) return false;
  const a = document.createElement('a');
  a.id = STEAL_BTN_ID;
  a.href = '#';
  a.className = 'steal-item-specifics';
  a.textContent = 'Steal Item Specifics';
  a.style.cssText = 'display:block;margin-top:8px;font-weight:600;color:#3563d6;cursor:pointer;';
  anchor.parentNode.insertBefore(a, anchor.nextSibling);
  a.addEventListener('click', async e => {
    e.preventDefault();
    let specs = stealItemSpecifics();
    if (Object.keys(specs).length === 0) specs = stealSpecsAlt();
    if (Object.keys(specs).length === 0) { alert('No item specifics found on this page.'); return; }
    await chrome.storage.local.set({ item_specifics: { jsonItemSpecifics: specs } });
    a.textContent = '✅ Stolen! Go to eBay listing form to paste.';
    setTimeout(() => { a.textContent = 'Steal Item Specifics'; }, 3000);
  });
  return true;
}

// ── One-shot injection: try immediately, watch with observer until the buybox appears ──
if (!injectStealButton()) {
  const _stealObs = new MutationObserver(function () {
    if (injectStealButton()) _stealObs.disconnect();
  });
  _stealObs.observe(document.body, { childList: true, subtree: true });
}
