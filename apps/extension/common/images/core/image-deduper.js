// Dedup by stable base image id, not raw URL
// Merges variants map from duplicate sources

function dedup(images) {
  const map = new Map(); // baseId → ExtractedImage

  for (const img of images) {
    const key = img.id || img.url;
    if (!key) continue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...img, variants: { ...img.variants } });
    } else {
      // Keep higher-confidence entry, merge variants
      const merged = existing.confidence >= img.confidence ? existing : { ...img };
      merged.variants = { ...existing.variants, ...img.variants };
      // Preserve variantKey if missing on winner
      if (!merged.variantKey && (existing.variantKey || img.variantKey)) {
        merged.variantKey = existing.variantKey || img.variantKey;
      }
      map.set(key, merged);
    }
  }

  return Array.from(map.values());
}

// Assign stable base id to each image using marketplace normalizer
function assignIds(images, marketplace) {
  const { getBaseId } = window.SSImageNormalizer || {};
  if (!getBaseId) return images;
  return images.map(img => ({
    ...img,
    id: img.id || getBaseId(img.url, marketplace) || img.url
  }));
}

if (typeof window !== 'undefined') {
  window.SSImageDeduper = { dedup, assignIds };
}
