// Product image cache keyed by "marketplace:productId"
// Stores in chrome.storage.local

const CACHE_KEY_PREFIX  = 'ss_img_cache_';
const CACHE_TTL_MS      = 30 * 60 * 1000; // 30 min

function cacheKey(marketplace, productId) {
  return `${CACHE_KEY_PREFIX}${marketplace}:${productId}`;
}

async function get(marketplace, productId) {
  const key = cacheKey(marketplace, productId);
  return new Promise(resolve => {
    chrome.storage.local.get([key], result => {
      const entry = result[key];
      if (!entry) return resolve(null);
      if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        chrome.storage.local.remove(key);
        return resolve(null);
      }
      resolve(entry);
    });
  });
}

async function set(marketplace, productId, images, processedImages = null) {
  const key = cacheKey(marketplace, productId);
  const entry = {
    marketplace,
    productId,
    images,            // ExtractedImage[]
    processedImages,   // { imageId: dataUrl } — watermarked/resized cache
    cachedAt: Date.now()
  };
  return new Promise(resolve => {
    chrome.storage.local.set({ [key]: entry }, resolve);
  });
}

async function clear(marketplace, productId) {
  return new Promise(resolve => {
    chrome.storage.local.remove(cacheKey(marketplace, productId), resolve);
  });
}

// Store processed (watermarked) image data url for a specific image id
async function setProcessed(marketplace, productId, imageId, dataUrl) {
  const entry = await get(marketplace, productId);
  if (!entry) return;
  const processed = entry.processedImages || {};
  processed[imageId] = dataUrl;
  await set(marketplace, productId, entry.images, processed);
}

async function getProcessed(marketplace, productId, imageId) {
  const entry = await get(marketplace, productId);
  return entry?.processedImages?.[imageId] || null;
}

if (typeof window !== 'undefined') {
  window.SSImageCache = { get, set, clear, setProcessed, getProcessed };
}
