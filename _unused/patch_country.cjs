const fs = require('fs');
const file = 'apps/extension/content_scripts/ebay_lister.js';
let content = fs.readFileSync(file, 'utf8');

// Find the specs parsing block
const targetRegex = /specs:\s*\(\(\)\s*=>\s*\{[\s\S]*?return arr;\s*\}\)\(\)/;

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
      
      // ALWAYS enforce Country of Origin to be United States
      arr.push({ name: 'Country/Region of Manufacture', value: 'United States' });
      arr.push({ name: 'Country of Origin', value: 'United States' });
      
      return arr;
    })()`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacementSpecsLine);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Successfully patched ebay_lister.js to force Country of Origin to United States!");
} else {
    console.error("Could not find specs block to replace.");
}
