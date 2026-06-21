const fs = require('fs');
const file = 'apps/extension/content_scripts/ebay_lister.js';
let content = fs.readFileSync(file, 'utf8');

// Find the storage fetch line
const targetStorageLine = "const storageData = await chrome.storage.local.get(['watermarkedImages', 'imageUrls', 'itemSpecifics']);";
const replacementStorageLine = "const storageData = await chrome.storage.local.get(['watermarkedImages', 'imageUrls', 'itemSpecifics', 'brand', 'model', 'color', 'dimensions', 'height', 'weight']);";
content = content.replace(targetStorageLine, replacementStorageLine);

// Find the specs parsing line inside auctionData object
const targetSpecsLine = "specs: data.itemSpecifics || storageData.itemSpecifics || []";
const replacementSpecsLine = `specs: (() => {
      let arr = data.itemSpecifics || storageData.itemSpecifics || [];
      if (!Array.isArray(arr) || arr.length === 0) {
          arr = [];
          if (data.brand || storageData.brand) arr.push({ name: 'Brand', value: data.brand || storageData.brand });
          if (data.model || storageData.model) arr.push({ name: 'Model', value: data.model || storageData.model });
          if (data.color || storageData.color) arr.push({ name: 'Color', value: data.color || storageData.color });
          if (data.dimensions || storageData.dimensions) arr.push({ name: 'Dimensions', value: data.dimensions || storageData.dimensions });
          if (data.height || storageData.height) arr.push({ name: 'Height', value: data.height || storageData.height });
          if (data.weight || storageData.weight) arr.push({ name: 'Weight', value: data.weight || storageData.weight });
      }
      return arr;
    })()`;
content = content.replace(targetSpecsLine, replacementSpecsLine);

fs.writeFileSync(file, content, 'utf8');
console.log("Successfully patched ebay_lister.js to accept object properties as item specifics!");
