/**
 * Unified gateway to prepare any image format for eBay upload.
 * Ensures all images reach eBay as binary Files/Blobs.
 *
 * @param {File|Blob|string|object} imageItem - Input image
 * @param {number} index - Index of the image (0-based)
 * @returns {Promise<File>} Resolved File object ready for eBay upload
 */
async function prepareImageForEbayUpload(imageItem, index = 0) {
  if (!imageItem) {
    throw new Error('prepareImageForEbayUpload: imageItem is empty or null');
  }

  const baseFilename = `product-image-${index + 1}`;
  let sourceDetected = '';
  let conversionPath = '';
  let finalMime = 'image/jpeg';
  let finalBlob = null;

  try {
    // 1. Branch: File
    if (imageItem instanceof File) {
      sourceDetected = 'File';
      conversionPath = 'passthrough';
      finalBlob = imageItem;
      finalMime = imageItem.type || 'image/jpeg';
    }
    // 2. Branch: Blob
    else if (imageItem instanceof Blob) {
      sourceDetected = 'Blob';
      conversionPath = 'wrap-in-file';
      finalBlob = imageItem;
      finalMime = imageItem.type || 'image/jpeg';
    }
    // 3. Branch: Object wrappers
    else if (typeof imageItem === 'object') {
      if (imageItem.file instanceof File || imageItem.file instanceof Blob) {
        return prepareImageForEbayUpload(imageItem.file, index);
      }
      if (typeof imageItem.url === 'string') {
        return prepareImageForEbayUpload(imageItem.url, index);
      }
      if (typeof imageItem.dataUrl === 'string') {
        return prepareImageForEbayUpload(imageItem.dataUrl, index);
      }
      throw new Error('prepareImageForEbayUpload: unrecognized object structure');
    }
    // 4. Branch: String (Data URL or HTTP URL)
    else if (typeof imageItem === 'string') {
      // 4a. Data URL (Base64)
      if (imageItem.startsWith('data:image/')) {
        sourceDetected = 'Data URL (Base64)';
        conversionPath = 'fetch-blob-decode';
        // Amendment B: use fetch-based conversion instead of atob byte-loop
        const response = await fetch(imageItem);
        finalBlob = await response.blob();
        finalMime = finalBlob.type || 'image/jpeg';
      }
      // 4b. Supplier URL (HTTP/HTTPS/Protocol-relative)
      else if (imageItem.startsWith('http') || imageItem.startsWith('//')) {
        let fetchUrl = imageItem.startsWith('//') ? 'https:' + imageItem : imageItem;
        sourceDetected = `Supplier URL (${fetchUrl})`;
        conversionPath = 'service-worker-fetch';

        const origin = new URL(fetchUrl).origin;

        // Messaging to service worker for cross-origin fetch
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { action: 'FETCH_IMAGE_AS_BASE64', url: fetchUrl },
            (res) => {
              if (chrome.runtime.lastError) {
                reject(new Error(`Service worker communication error: ${chrome.runtime.lastError.message}`));
              } else {
                resolve(res);
              }
            }
          );
        });

        if (response && response.success && response.base64) {
          // Decode the returned base64 using the same fetch-based decode
          const base64Response = await fetch(response.base64);
          finalBlob = await base64Response.blob();
          finalMime = finalBlob.type || 'image/jpeg';
        } else {
          const errMsg = response?.error || 'Unknown SW fetch error';
          if (errMsg.includes('Host permission missing') || errMsg.includes('opaque') || errMsg.includes('Failed to fetch')) {
            console.error(`[SS IMG] host permission missing for ${origin}`);
            throw new Error(`host permission missing for ${origin}`);
          }
          throw new Error(`SW fetch failed: ${errMsg}`);
        }
      } else {
        throw new Error('prepareImageForEbayUpload: unrecognized string format');
      }
    } else {
      throw new Error(`prepareImageForEbayUpload: unsupported format type: ${typeof imageItem}`);
    }

    // Amendment E: Format safety validation
    const acceptedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!acceptedMimes.includes(finalMime.toLowerCase())) {
      console.log(`[SS IMG] Format safety re-encoding: ${finalMime} is not in eBay's accepted set. Re-encoding to image/jpeg...`);
      
      const isServiceWorker = typeof document === 'undefined';
      if (isServiceWorker) {
        if (!await chrome.offscreen.hasDocument()) {
          await chrome.offscreen.createDocument({
            url: chrome.runtime.getURL('background/offscreen.html'),
            reasons: ['DOM_PARSER'],
            justification: 'Re-encode unsupported image formats'
          });
        }
        
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(finalBlob);
        });

        const resp = await chrome.runtime.sendMessage({
          action: 'OFFSCREEN_RE_ENCODE',
          blobUrl: base64Data,
          mimeType: 'image/jpeg'
        });
        
        if (resp && resp.success) {
          const res = await fetch(resp.base64);
          finalBlob = await res.blob();
        } else {
          throw new Error('Offscreen format safety re-encoding failed: ' + (resp ? resp.error : 'Unknown error'));
        }
      } else {
        finalBlob = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((b) => {
              if (b) {
                resolve(b);
              } else {
                reject(new Error('Format safety re-encoding failed: canvas toBlob empty'));
              }
            }, 'image/jpeg', 0.95);
          };
          img.onerror = () => reject(new Error('Format safety re-encoding failed: image load error'));
          img.src = URL.createObjectURL(finalBlob);
        });
      }
      finalMime = 'image/jpeg';
      conversionPath += ' + canvas-re-encode';
    }

    // Determine safe extension based on final MIME type
    const ext = finalMime.toLowerCase().includes('png') ? 'png' : 'jpg';
    const finalFile = new File([finalBlob], `${baseFilename}.${ext}`, { type: finalMime });

    console.info(
      `[SS IMG] Image conversion complete:\n` +
      `  - Source detected: ${sourceDetected}\n` +
      `  - Conversion path: ${conversionPath}\n` +
      `  - Final MIME: ${finalMime}\n` +
      `  - Final Size: ${finalFile.size} bytes\n` +
      `  - Target: File/Blob`
    );

    return finalFile;

  } catch (error) {
    console.error(`[SS IMG] prepareImageForEbayUpload failed at index ${index}:`, error.message);
    throw error;
  }
}

if (typeof window !== 'undefined') {
  window.prepareImageForEbayUpload = prepareImageForEbayUpload;
}
