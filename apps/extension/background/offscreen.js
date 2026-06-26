chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'OFFSCREEN_RE_ENCODE') {
    handleReEncode(msg.blobUrl, msg.mimeType)
      .then(base64 => sendResponse({ success: true, base64 }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
});

async function handleReEncode(blobUrl, targetMime = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.getElementById('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const dataUrl = canvas.toDataURL(targetMime, 0.95);
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error('Offscreen Format safety re-encoding failed: image load error'));
    img.src = blobUrl;
  });
}
