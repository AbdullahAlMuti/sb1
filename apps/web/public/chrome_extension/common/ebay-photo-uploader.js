// ─────────────────────────────────────────────────────────────────────────────
// EbayPhotoUploader — ported from SuperDS PhotoUploader
// Strategy 1 (primary): fetch image as blob in content script (has CDN host
//   permissions) → append File to FormData → EPS receives binary multipart.
//   Zero server cost, works for all 50K users simultaneously.
// Strategy 2 (fallback): pass a proxy URL so EPS server fetches it instead.
//   Used when direct fetch fails (CORS block, network error, etc.).
// ─────────────────────────────────────────────────────────────────────────────

// Fallback proxy — set to your Cloudflare Worker URL once deployed,
// or to sellersuit.com endpoint. Only used when direct blob fetch fails.
const _SS_IMG_PROXY = 'https://sellersuit.com/api/extension/image';

window.EbayPhotoUploader = {
  /**
   * Upload one image to eBay's EPS Basic photo service.
   * @param {File|Blob|string|object} imageItem - Input image (File, Blob, Data URL, supplier URL)
   * @param {object} epsData - { uaek, uaes } from eBay listing page inline JSON
   * @param {number} index - Index of the image (0-based)
   * @returns {Promise<string>} eBay photo ID / URL
   */
  async uploadPhoto(imageItem, epsData, index = 0) {
    if (!epsData?.uaek || !epsData?.uaes) {
      throw new Error('EbayPhotoUploader: epsData missing uaek/uaes');
    }

    // Prepare the image using the unified gateway
    const file = await prepareImageForEbayUpload(imageItem, index);

    const fd = new FormData();
    fd.append('s',         'SuperSize');
    fd.append('n',         'i');
    fd.append('v',         '2');
    fd.append('uaek',      epsData.uaek);
    fd.append('uaes',      epsData.uaes);
    fd.append('aXRequest', '2');
    fd.append('wm',        '');
    fd.append('w',         file);

    // Pre-upload guards
    const fileVal = fd.get('w');
    console.log(`[SS EPS] Pre-upload guard check: source detected = ${fileVal instanceof File ? 'File' : fileVal instanceof Blob ? 'Blob' : typeof fileVal}`);

    if (typeof fileVal === 'string') {
      if (fileVal.startsWith('http') || fileVal.startsWith('//')) {
        console.error(`[SS EPS] direct URL upload BLOCKED: ${fileVal}`);
        throw new Error('EbayPhotoUploader: Direct URL upload blocked by security guard.');
      }
    }

    if (!(fileVal instanceof File || fileVal instanceof Blob)) {
      throw new Error('EbayPhotoUploader: Pre-upload guard failed, value is not a File or Blob.');
    }

    console.log(`[SS EPS] Pre-upload guard passed. Uploading as File/Blob: size = ${fileVal.size} bytes, type = ${fileVal.type}`);

    const resp = await fetch('https://msa-b1.ebay.com/ws/eBayISAPI.dll?EpsBasic', {
      method: 'POST',
      body:   fd
    });
    const text  = await resp.text();
    const parts = text.split(';');

    if (parts.length <= 1)          throw new Error('EPS upload failed: empty response');
    if (parts[1] === 'ERROR:WC002') throw new Error('EPS upload error WC002');

    return parts[1];
  }
};
