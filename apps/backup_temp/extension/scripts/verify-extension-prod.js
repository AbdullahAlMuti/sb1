import fs from 'fs';
import path from 'path';

const DIST_DIR = path.resolve('./dist/extension-prod');

const FORBIDDEN_STRINGS = [
  'localhost',
  '127.0.0.1',
  'DEBUG_MODE: true',
  'DEBUG = true',
  'console.log(productData)',
  'console.log(exportData)',
  "console.log('🎉 ORDER COMPLETED:', request.payload)",
  "console.log('📦 DESCRIPTION: FULL SCRAPED PRODUCT DATA')",
  "console.log('📋 SCRAPE PREVIEW: Full scraped data')"
];

const FORBIDDEN_FILES = [
  '.env',
  'manifest.dev.json',
  'manifest.prod.json',
  '.git',
  'node_modules'
];

let failed = false;

function scanDir(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Production build directory not found: ${dir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (FORBIDDEN_FILES.includes(entry.name)) {
      console.error(`❌ Forbidden file/folder found in production build: ${fullPath}`);
      failed = true;
      continue;
    }
    
    // Ignore images
    if (entry.name.match(/\.(png|jpg|jpeg|gif|ico|svg|webp)$/i)) continue;

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const str of FORBIDDEN_STRINGS) {
        if (content.includes(str)) {
          console.error(`❌ Forbidden string "${str}" found in production file: ${fullPath}`);
          failed = true;
        }
      }
    }
  }
}

console.log('Scanning Production Extension...');
scanDir(DIST_DIR);

if (failed) {
  console.error('❌ Production Verification FAILED. Do not publish.');
  process.exit(1);
} else {
  console.log('✅ Production Verification PASSED. Safe to publish.');
}
