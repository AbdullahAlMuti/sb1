// URL normalization rules per marketplace

const AMAZON_RULES = {
  cdnDomains: [
    'm.media-amazon.com',
    'images-na.ssl-images-amazon.com',
    'images-eu.ssl-images-amazon.com',
    'images-fe.ssl-images-amazon.com'
  ],
  // Strip all size/crop tokens; append _AC_SL3000_
  normalize(url) {
    if (!url || typeof url !== 'string') return url;
    // Remove size qualifier block: ._<tokens>. before extension
    const baseMatch = url.match(/^(https?:\/\/[^/]+\/images\/I\/[A-Za-z0-9._+%-]+?)\._[^.]*\.(jpg|jpeg|png|webp)$/i);
    if (baseMatch) return `${baseMatch[1]}._AC_SL3000_.${baseMatch[2]}`;
    // Replace known size patterns
    const sizeRe = /\._AC_S[XLYS]\d+_|\._AC_U[SXYL]\d+_|\._S[SXYL]\d+_|\._U[SXYL]\d+_|\._CR[\d,]+_|\._SL\d+_/gi;
    let out = url.replace(sizeRe, '._AC_SL3000_');
    // If still no SL3000, inject before extension
    if (!out.includes('_SL3000_') && !out.includes('._')) {
      out = out.replace(/\.(jpg|jpeg|png|webp)$/i, '._AC_SL3000_.$1');
    }
    return out;
  },
  // Extract stable base id: image filename without size tokens
  baseId(url) {
    if (!url) return url;
    const m = url.match(/\/images\/I\/([A-Za-z0-9._+%-]+?)(?:\._|\.(?:jpg|jpeg|png|webp))/i);
    return m ? m[1] : url;
  }
};

const WALMART_RULES = {
  cdnDomains: ['i5.walmartimages.com', 'i8.walmartimages.com'],
  normalize(url) {
    if (!url || typeof url !== 'string') return url;
    let out = url;
    // Upgrade odn size params to large
    out = out.replace(/odnWidth=\d+/g,  'odnWidth=1200');
    out = out.replace(/odnHeight=\d+/g, 'odnHeight=1200');
    out = out.replace(/odnBg=[^&]+/g,   'odnBg=ffffff');
    // Pattern-based size token upgrades
    out = out.replace(/_\d{2,3}x\d{2,3}\./g, '_1200x1200.');
    out = out.replace(/\/\d{2,3}x\d{2,3}\//g, '/1200x1200/');
    out = out.replace(/w_\d+/g, 'w_1200');
    out = out.replace(/h_\d+/g, 'h_1200');
    return out;
  },
  baseId(url) {
    if (!url) return url;
    // Walmart image id = filename without extension and size
    const m = url.match(/\/([A-Za-z0-9_-]{20,})\/?(?:\.[a-z]+)?(?:\?|$)/i);
    return m ? m[1] : url;
  }
};

const RULES = { amazon: AMAZON_RULES, walmart: WALMART_RULES };

function normalizeImage(image, marketplace) {
  const rules = RULES[marketplace];
  if (!rules) return image;
  return {
    ...image,
    url: rules.normalize(image.url),
    variants: Object.fromEntries(
      Object.entries(image.variants || {}).map(([k, v]) => [k, rules.normalize(v)])
    )
  };
}

function getBaseId(url, marketplace) {
  return RULES[marketplace]?.baseId(url) || url;
}

if (typeof window !== 'undefined') {
  window.SSImageNormalizer = { normalizeImage, getBaseId, RULES };
}
