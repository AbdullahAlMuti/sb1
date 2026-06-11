import JSZip from 'jszip';

// Extension file contents - these would need to be fetched or embedded
// For now, we'll create a download that fetches files from the repo

export interface ExtensionFile {
  path: string;
  content: string;
}

// List of all extension files to include in the zip
export const extensionFiles = [
  // Root files
  'manifest.json',
  'background/index.js',
  'background/message-router.js',
  'background/alarm-handler.js',
  'background/listing-runner.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'options.html',
  
  // Common folder
  'common/analytics.js',
  'common/config.js',
  'common/constants.js',
  'common/retry-helper.js',
  'common/api-client.js',
  'common/sync-utils.js',
  'common/description-generator.js',
  'common/editor-tools.js',
  'common/editor_core.js',
  'common/message-handler.js',
  'common/performance.js',
  'common/storage.js',
  'common/ui.js',
  'common/undo-manager.js',
  'common/auth-helper.js',
  'common/amazon_image_extractor.js',
  'common/full_view_image_extractor.js',
  'common/image-renderer.js',
  
  // Content scripts
  'content_scripts/amazon_injector.js',
  'content_scripts/bridge.js',
  'content_scripts/description_paster.js',
  'content_scripts/ebay_lister.js',
  'content_scripts/image_editor.js',
  'content_scripts/walmart_injector.js',
  'content_scripts/ebay_prelist.js',
  'content_scripts/ebay_orders_sync_trigger.js',
  'content_scripts/ebay_order_detail_scraper.js',
  'content_scripts/amazon_fulfiller.js',
  
  // UI folder
  'ui/editor-popup.html',
  'ui/editor-popup.css',
  'ui/editor_frame.html',
  'ui/panel.html',
  'ui/panel.css',
  'ui/panel.js',
  'ui/calculator.js',
  'ui/new_title_styles.css',
  'ui/popup_fix.css',
  'ui/product-details-popup.html',
  'ui/product-details-popup.css',
  
  // Src folder
  'src/automation-clean.js',
  'src/image-uploader.js',
  'src/item-filler.js',
  
  // Icons
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
  
  // Assets
  'assets/logo.png',
  'assets/watermark.png',
  'assets/free shipping.png',
  'assets/stickers/best.png',
  'assets/stickers/gift.png',
  'assets/stickers/hot.png',
  'assets/stickers/limited.png',
  'assets/stickers/new.png',
  'assets/stickers/sale.png',
  'assets/stickers/watermark.png',
];

export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();
  const extensionFolder = zip.folder('sellersuit-extension');
  
  if (!extensionFolder) {
    throw new Error('Failed to create extension folder in zip');
  }

  // Create README with installation instructions
  const readmeContent = `# SellerSuit Chrome Extension

## Installation Instructions

1. Extract this zip file to a folder on your computer
2. Open Google Chrome browser
3. Navigate to chrome://extensions (copy and paste this into your address bar)
4. Enable "Developer mode" by clicking the toggle in the top right corner
5. Click the "Load unpacked" button
6. Select the "sellersuit-extension" folder from where you extracted the files
7. The extension should now appear in your extensions list
8. Click the puzzle piece icon in Chrome's toolbar and pin the SellerSuit extension

## Features

- Amazon to eBay listing automation
- AI-powered title and description generation
- Image editing and watermarking
- Inventory sync and price monitoring


## Troubleshooting

If the extension doesn't load:
- Make sure all files are in the correct folder structure
- Check that manifest.json is in the root of the sellersuit-extension folder
- Look for any error messages in the chrome://extensions page

## Support

Visit your dashboard at the SellerSuit website for support and documentation.
`;

  extensionFolder.file('README.txt', readmeContent);

  // Fetch each file and add to zip
  const baseUrl = window.location.origin;
  let successCount = 0;
  let failCount = 0;

  // Try to load dynamic file list from files.json
  let filesToDownload = extensionFiles;
  try {
    const manifestResp = await fetch(`${baseUrl}/chrome_extension/files.json`);
    if (manifestResp.ok) {
      const dynamicFiles = await manifestResp.json();
      if (Array.isArray(dynamicFiles) && dynamicFiles.length > 0) {
        filesToDownload = dynamicFiles;
        if (import.meta.env.DEV) console.log(`[Extension Downloader] Loaded ${filesToDownload.length} files dynamically`);
      }
    }
  } catch (e) {
    console.warn('[Extension Downloader] Failed to fetch dynamic files.json, falling back to static list:', e);
  }

  for (const filePath of filesToDownload) {
    try {
      // Try to fetch the file from the chrome_extension folder
      const response = await fetch(`${baseUrl}/chrome_extension/${filePath}`);
      
      if (response.ok) {
        // Check if it's a binary file (images)
        if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
          const blob = await response.blob();
          extensionFolder.file(filePath, blob);
        } else {
          const content = await response.text();
          extensionFolder.file(filePath, content);
        }
        successCount++;
      } else {
        console.warn(`Failed to fetch: ${filePath}`);
        failCount++;
      }
    } catch (error) {
      console.warn(`Error fetching ${filePath}:`, error);
      failCount++;
    }
  }

  if (import.meta.env.DEV) console.log(`Extension zip: ${successCount} files added, ${failCount} failed`);

  // Generate and download the zip
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sellersuit-extension.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
