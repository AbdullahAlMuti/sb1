// Modal click fallback extractor.
// Wraps window.FullViewImageExtractor if loaded, or runs lean standalone walk.
// Used ONLY when tiers 1–4 return insufficient images.

class ModalClickExtractor {
  constructor() {
    this._seenIds = new Set();
  }

  // Returns ExtractedImage[] via window.SSImageSchema
  async extract() {
    const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema || {};
    if (!createExtractedImage) return [];

    // Prefer existing FullViewImageExtractor if available
    if (typeof window.FullViewImageExtractor !== 'undefined') {
      try {
        const fv = new window.FullViewImageExtractor();
        const result = await fv.extractAllProductImagesFromFullView();
        return (result?.images || []).map(img => createExtractedImage({
          url:    img.url,
          source: ImageSource.MODAL,
          role:   ImageRole.GALLERY,
          alt:    img.alt || 'Product Image'
        }));
      } catch (err) {
        console.warn('[ModalClickExtractor] FullViewImageExtractor failed:', err?.message);
      }
    }

    // Lean standalone walk
    return this._standaloneWalk(createExtractedImage, ImageSource, ImageRole);
  }

  async _standaloneWalk(createExtractedImage, ImageSource, ImageRole) {
    this._seenIds.clear();
    const images = [];

    const mainImg = document.querySelector('#landingImage, #imgBlkFront, #main-image');
    if (!mainImg) return images;

    const clickTarget = mainImg.closest('a, button, [role="button"]') || mainImg.parentElement;
    if (!clickTarget) return images;

    clickTarget.click();
    const modal = await this._waitFor(() => this._getModal(), 7000);
    if (!modal) return images;

    const thumbs = await this._waitFor(() => {
      const list = this._getModalThumbs(modal);
      return list.length ? list : null;
    }, 5000);

    for (const thumb of (thumbs || [])) {
      try {
        const before = this._modalSig(modal);
        const btn = thumb.closest('button, a, [role="button"]') || thumb;
        btn.click();
        await this._waitFor(() => this._modalSig(modal) !== before, 5000);

        const mainEl = this._getModalMain(modal);
        const url = this._hiResFromImg(mainEl) || thumb.src;
        if (!url) continue;

        const baseId = this._baseId(url);
        if (baseId && this._seenIds.has(baseId)) continue;
        if (baseId) this._seenIds.add(baseId);

        images.push(createExtractedImage({
          url:    this._maxRes(url),
          source: ImageSource.MODAL,
          role:   ImageRole.GALLERY,
          alt:    mainEl?.alt || 'Product Image'
        }));
      } catch {}
    }

    this._closeModal();
    return images;
  }

  _getModal() {
    return document.querySelector('[role="dialog"][aria-modal="true"]')
      || document.querySelector('#a-popover-lgtbox')
      || document.querySelector('.a-modal')
      || document.querySelector('#ivLargeImage')
      || null;
  }

  _getModalThumbs(modal) {
    return Array.from(modal.querySelectorAll(
      'img.imageThumbnail, .imageThumbnail img, #ivThumbs img, [data-index] img'
    )).filter(img => {
      const src = (img.src || '').toLowerCase();
      return src.includes('media-amazon') && src.includes('/images/i/')
        && !src.includes('play') && !src.includes('video') && !src.includes('360');
    });
  }

  _getModalMain(modal) {
    const imgs = Array.from(modal.querySelectorAll('img[src*="media-amazon"], img[data-old-hires]'));
    if (!imgs.length) return null;
    const withMeta = imgs.find(img => img.getAttribute('data-old-hires') || img.getAttribute('data-a-dynamic-image'));
    if (withMeta) return withMeta;
    return imgs.reduce((best, cur) =>
      (cur.clientWidth * cur.clientHeight) > (best.clientWidth * best.clientHeight) ? cur : best
    , imgs[0]);
  }

  _modalSig(modal) {
    const img = this._getModalMain(modal);
    return img?.getAttribute('data-old-hires') || img?.getAttribute('data-a-dynamic-image') || img?.src || null;
  }

  _hiResFromImg(img) {
    if (!img) return null;
    const oh = img.getAttribute('data-old-hires');
    if (oh) return oh;
    const dyn = img.getAttribute('data-a-dynamic-image');
    if (dyn) {
      try {
        const map = JSON.parse(dyn);
        return Object.keys(map).reduce((best, url) => {
          if (!best) return url;
          const a = (map[best]?.[0] || 0) * (map[best]?.[1] || 0);
          const b = (map[url]?.[0] || 0) * (map[url]?.[1] || 0);
          return b > a ? url : best;
        }, null);
      } catch {}
    }
    return img.getAttribute('src') || null;
  }

  _maxRes(url) {
    if (!url) return url;
    if (url.includes('._')) {
      const base = url.split('._')[0];
      const ext  = url.match(/\.(jpg|jpeg|png|webp)$/i)?.[0] || '.jpg';
      return base + ext;
    }
    return url.replace(/\.(jpg|jpeg|png|webp)$/i, '._AC_SL3000_.$1');
  }

  _baseId(url) {
    return url?.match(/\/images\/I\/([^/]+?)(?:\._|\.(?:jpg|jpeg|png|webp))/i)?.[1] || null;
  }

  _closeModal() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
    document.querySelector('[data-action="close"], .a-button-close, [aria-label*="Close"]')?.click();
  }

  _waitFor(fn, timeoutMs = 5000, intervalMs = 50) {
    return new Promise(resolve => {
      const start = Date.now();
      const tick  = () => {
        try { const v = fn(); if (v) return resolve(v); } catch {}
        if (Date.now() - start >= timeoutMs) return resolve(null);
        setTimeout(tick, intervalMs);
      };
      tick();
    });
  }
}

if (typeof window !== 'undefined') {
  window.SSModalClickExtractor = ModalClickExtractor;
}
