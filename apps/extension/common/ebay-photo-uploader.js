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
   * @param {string} imageUrl  — Amazon/supplier CDN image URL
   * @param {object} epsData   — { uaek, uaes } from eBay listing page inline JSON
   * @returns {Promise<string>} eBay photo ID (used in listing draft pictures[])
   */
  async uploadPhoto(imageUrl, epsData) {
    if (!epsData?.uaek || !epsData?.uaes) {
      throw new Error('EbayPhotoUploader: epsData missing uaek/uaes');
    }

    const fd = new FormData();
    fd.append('s',         'SuperSize');
    fd.append('n',         'i');
    fd.append('v',         '2');
    fd.append('uaek',      epsData.uaek);
    fd.append('uaes',      epsData.uaes);
    fd.append('aXRequest', '2');
    fd.append('wm',        '');

    // ── Strategy 0: data URL → Blob directly (watermarked images from panel) ──
    // EpsBasic returns semicolon-separated text (SUCCESS;photoId) for all
    // multipart uploads — same as the blob/proxy strategies — so this only
    // builds the File and falls through to the shared fetch + parse below.
    let usedStrategy = 'blob';
    if (imageUrl.startsWith('data:image')) {
      const [header, b64] = imageUrl.split(',');
      const mime = (header.match(/:(.*?);/) || [])[1] || 'image/jpeg';
      const binary = atob(b64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      fd.append('w', new File([arr], `photo.${ext}`, { type: mime }));
      usedStrategy = 'dataurl';
    } else {
      // ── Strategy 1: fetch image blob directly ──────────────────────────────
      // Content script has host_permissions for *.media-amazon.com, *.ssl-images-
      // amazon.com, *.images-amazon.com, *.walmartimages.com — covers all major
      // supplier CDNs. Append as File so EPS accepts binary multipart upload.
      try {
        const imgResp = await fetch(imageUrl, { mode: 'cors' });
        if (!imgResp.ok) throw new Error(`Image fetch ${imgResp.status}`);
        const blob    = await imgResp.blob();
        const mime    = blob.type || 'image/jpeg';
        const ext     = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        fd.append('w', new File([blob], `photo.${ext}`, { type: mime }));
      } catch (fetchErr) {
        // ── Strategy 2: fallback to proxy URL ────────────────────────────────
        // EPS server fetches from this URL. Requires proxy endpoint to be live.
        console.warn('[SS EPS] Direct blob fetch failed, using proxy fallback:', fetchErr.message);
        usedStrategy = 'proxy';
        const proxyUrl = imageUrl.includes(_SS_IMG_PROXY)
          ? imageUrl
          : `${_SS_IMG_PROXY}?url=${encodeURIComponent(imageUrl)}`;
        fd.append('w', proxyUrl);
      }
    }

    const resp  = await fetch('https://msa-b1.ebay.com/ws/eBayISAPI.dll?EpsBasic', {
      method: 'POST',
      body:   fd
    });
    const text  = await resp.text();
    const parts = text.split(';');

    if (parts.length <= 1)          throw new Error(`EPS upload failed (strategy=${usedStrategy}): empty response`);
    if (parts[1] === 'ERROR:WC002') throw new Error(`EPS upload error WC002 (strategy=${usedStrategy})`);

    return parts[1];
  }
};
