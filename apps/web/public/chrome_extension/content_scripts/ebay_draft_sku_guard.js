// ─────────────────────────────────────────────────────────────────────────────
// ebay_draft_sku_guard.js — Custom Label (SKU) DOM correction guard.
//
// The single-listing draft save goes through eBay's undocumented internal
// listing_draft API, whose exact JSON key for Custom Label has never been
// confirmed (sku vs customLabel — both are sent defensively, see
// ebay-listing-api.js updateListing). This guard is a second, independent
// mechanism that doesn't depend on knowing that key at all: it finds eBay's
// own rendered Custom Label input on the real draft-edit page (the same field
// a human seller types into) and fills it directly if it's missing, using the
// same interaction eBay already reliably persists for every manually-listed
// item — see the 13k+ real orders with a populated custom_label column.
// ─────────────────────────────────────────────────────────────────────────────

(async function() {
  const params = new URLSearchParams(window.location.search);
  const uploadSessionId = params.get('uploadSessionId');
  if (!uploadSessionId) return;

  const stored = await chrome.storage.local.get(uploadSessionId);
  const session = stored[uploadSessionId];
  const guard = session && session.skuGuard;
  if (!guard || !guard.sentSku) return;

  console.log('[SS SKU Guard] Watching draft page for Custom Label field...', { sentSku: guard.sentSku });

  // Heuristic field-finder — eBay's exact markup/class names aren't documented,
  // so match on the semantics a seller would see: a label/aria-label/placeholder
  // mentioning "custom label" or "sku", paired with the nearest text input.
  function findCustomLabelInput() {
    const candidates = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
    for (const input of candidates) {
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
      const name = (input.getAttribute('name') || '').toLowerCase();
      const id = (input.getAttribute('id') || '').toLowerCase();
      const labelText = (() => {
        if (input.id) {
          const lbl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
          if (lbl) return lbl.textContent.toLowerCase();
        }
        const closestLabel = input.closest('label');
        if (closestLabel) return closestLabel.textContent.toLowerCase();
        // Look for a label-like sibling/ancestor within a reasonable radius
        const container = input.closest('[class], div');
        return container ? container.textContent.toLowerCase() : '';
      })();

      const haystacks = [aria, placeholder, name, id, labelText];
      if (haystacks.some(h => h.includes('custom label') || h.includes('customlabel') || h.includes('sku'))) {
        return input;
      }
    }
    return null;
  }

  function setNativeInputValue(input, value) {
    const proto = window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(input, value);
    // React/Vue controlled inputs listen for native 'input' events dispatched
    // this way, not plain value assignment, to pick up the change.
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function reportResult(result) {
    try {
      // create-listing's RPC replaces ebay_data wholesale (no deep merge), so this
      // single write carries BOTH the earlier API-readback confirmation and this
      // DOM-guard result — otherwise this write would silently erase the former.
      chrome.runtime.sendMessage({
        action: 'SYNC_LISTING',
        payload: {
          sku: guard.sentSku,
          amazon_asin: guard.amazonAsin,
          amazon_url: guard.amazonUrl,
          title: guard.title,
          status: 'draft',
          ebay_data: {
            sku_confirmation: guard.apiConfirmation || null,
            sku_dom_guard: result
          }
        }
      }, () => { /* best-effort — dashboard row already exists, this only updates ebay_data */ });
    } catch (e) {
      console.warn('[SS SKU Guard] Failed to report result:', e && e.message);
    }
  }

  let attempts = 0;
  const maxAttempts = 30; // ~15s at 500ms — draft page is usually ready well before this
  const poll = setInterval(async () => {
    attempts++;
    const input = findCustomLabelInput();

    if (input) {
      clearInterval(poll);
      const currentValue = (input.value || '').trim();
      if (currentValue === guard.sentSku) {
        console.log('[SS SKU Guard] Custom Label already correct on the real draft page — API submission worked.');
        await reportResult({ found: true, alreadyCorrect: true, observedValue: currentValue });
      } else {
        setNativeInputValue(input, guard.sentSku);
        console.log('[SS SKU Guard] Custom Label field was empty/incorrect — corrected directly via DOM.', {
          previousValue: currentValue, newValue: guard.sentSku
        });
        await reportResult({ found: true, alreadyCorrect: false, previousValue: currentValue, correctedTo: guard.sentSku });
      }
      return;
    }

    if (attempts >= maxAttempts) {
      clearInterval(poll);
      console.warn('[SS SKU Guard] Could not locate a Custom Label field on the draft page after', maxAttempts * 500, 'ms.');
      await reportResult({ found: false });
    }
  }, 500);
})();
