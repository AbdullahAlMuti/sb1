// Cheap image validation. HEAD only for unknown/low-confidence images.

const AMAZON_CDN = [
  'm.media-amazon.com',
  'images-na.ssl-images-amazon.com',
  'images-eu.ssl-images-amazon.com',
  'images-fe.ssl-images-amazon.com'
];

const WALMART_CDN = [
  'i5.walmartimages.com',
  'i8.walmartimages.com',
  'walmartimages.com'
];

const EXCLUDE_PATTERNS = [
  'sprite', 'icon', 'logo', 'banner', 'transparent-pixel',
  'badge', 'button', 'nav', 'header', 'footer', 'review',
  'avatar', 'profile', 'spacer', 'loading', 'placeholder',
  'video', 'play-button', 'play_icon', 'play-icon',
  '360', 'spin', 'rotate', 'swatch', 'prime', 'shipping',
  'delivery', 'cart', 'wishlist', 'watermark', 'tracking'
];

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function isKnownCdn(url, marketplace) {
  const cdns = marketplace === 'amazon' ? AMAZON_CDN : WALMART_CDN;
  return cdns.some(d => url.includes(d));
}

function hasImageExtension(url) {
  const lower = url.toLowerCase().split('?')[0];
  return IMAGE_EXTS.some(ext => lower.endsWith(ext)) || lower.includes('walmartimages');
}

function hasExcludePattern(url) {
  const lower = url.toLowerCase();
  return EXCLUDE_PATTERNS.some(p => lower.includes(p));
}

// Tier-1/2 sources: trust CDN + no exclude = pass. Skip HEAD.
function validateCheap(image, marketplace) {
  const url = image.url;
  if (!url || url.length < 20) return false;
  if (hasExcludePattern(url)) return false;
  if (!isKnownCdn(url, marketplace) && !hasImageExtension(url)) return false;
  // Amazon: must include /images/I/ path
  if (marketplace === 'amazon' && !url.includes('/images/I/')) return false;
  return true;
}

// Optional HEAD for unknown images (confidence < threshold)
async function validateWithHead(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const ct = res.headers.get('content-type') || '';
    const cl = parseInt(res.headers.get('content-length') || '0', 10);
    return ct.startsWith('image/') && cl > 10000;
  } catch {
    return null; // null = unknown, keep anyway (never drop on HEAD fail)
  }
}

// Filter image list. headThreshold: confidence below which we run HEAD (optional).
async function filter(images, marketplace, { headThreshold = 0, maxHead = 5 } = {}) {
  const valid = [];
  let headCount = 0;

  for (const img of images) {
    if (!validateCheap(img, marketplace)) continue;

    if (img.confidence < headThreshold && headCount < maxHead) {
      headCount++;
      const headOk = await validateWithHead(img.url);
      if (headOk === false) continue; // explicit fail → drop
      // null (network error) or true → keep
    }

    valid.push(img);
  }

  return valid;
}

if (typeof window !== 'undefined') {
  window.SSImageValidator = { filter, validateCheap, validateWithHead };
}
