// Quarantined from apps/extension/background/message-router.js
// Restore note: This synchronous byte-string concat loop stalled the worker thread for large images.
// FileReader is now natively available in MV3 Service Workers, so this is redundant.
// To restore, wrap FileReader logic with: if (typeof FileReader !== 'undefined') { ... } else { [this block] }
/*
const buffer = await blob.arrayBuffer();
let binary = '';
const bytes = new Uint8Array(buffer);
for (let i = 0; i < bytes.byteLength; i++) {
  binary += String.fromCharCode(bytes[i]);
}
const base64String = btoa(binary);
sendResponse({ success: true, base64: `data:${blob.type};base64,${base64String}` });
*/
