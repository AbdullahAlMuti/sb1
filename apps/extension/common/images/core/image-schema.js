// Universal image schema for all marketplaces

const ImageSource = Object.freeze({
  HYDRATION:    'hydration',
  DYNAMIC_ATTR: 'dynamic-attr',
  SCRIPT:       'script',
  THUMBNAIL:    'thumbnail',
  MODAL:        'modal'
});

const ImageRole = Object.freeze({
  MAIN:      'main',
  GALLERY:   'gallery',
  VARIATION: 'variation'
});

const SOURCE_CONFIDENCE = {
  [ImageSource.HYDRATION]:    0.95,
  [ImageSource.DYNAMIC_ATTR]: 0.85,
  [ImageSource.SCRIPT]:       0.75,
  [ImageSource.THUMBNAIL]:    0.60,
  [ImageSource.MODAL]:        0.40
};

function createExtractedImage({
  id          = '',
  url         = '',
  variants    = {},   // { size: url } — known resolution alternatives
  source      = ImageSource.THUMBNAIL,
  confidence  = null,
  role        = ImageRole.GALLERY,
  variantKey  = null, // e.g. "Black Large" — links image to product variant
  width       = 0,
  height      = 0,
  alt         = 'Product Image'
} = {}) {
  return {
    id,
    url,
    variants,
    source,
    confidence: confidence ?? SOURCE_CONFIDENCE[source] ?? 0.5,
    role,
    variantKey,
    width,
    height,
    alt
  };
}

function createProductImageResult(marketplace, productId, images) {
  return { marketplace, productId, images };
}

if (typeof window !== 'undefined') {
  window.SSImageSchema = { ImageSource, ImageRole, SOURCE_CONFIDENCE, createExtractedImage, createProductImageResult };
}
