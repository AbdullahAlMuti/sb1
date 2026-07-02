import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

const rootPath = (...args) => resolve(ROOT_DIR, ...args);

const filesToAudit = [
  // Marketing
  { path: rootPath('apps/marketing/public/favicon.png'), desc: 'Marketing favicon.png' },
  { path: rootPath('apps/marketing/public/logo.png'), desc: 'Marketing logo.png' },
  { path: rootPath('apps/marketing/public/apple-touch-icon.png'), desc: 'Marketing apple-touch-icon.png' },
  { path: rootPath('apps/marketing/public/favicon.ico'), desc: 'Marketing favicon.ico' },
  { path: rootPath('apps/marketing/public/sitemap.xml'), desc: 'Marketing fallback sitemap.xml' },

  // Web App
  { path: rootPath('apps/web/public/favicon.png'), desc: 'Web App favicon.png' },
  { path: rootPath('apps/web/public/logo.png'), desc: 'Web App logo.png' },
  { path: rootPath('apps/web/public/apple-touch-icon.png'), desc: 'Web App apple-touch-icon.png' },
  { path: rootPath('apps/web/public/favicon.ico'), desc: 'Web App favicon.ico' },

  // Admin App
  { path: rootPath('apps/admin/public/favicon.png'), desc: 'Admin App favicon.png' },
  { path: rootPath('apps/admin/public/logo.png'), desc: 'Admin App logo.png' },
  { path: rootPath('apps/admin/public/apple-touch-icon.png'), desc: 'Admin App apple-touch-icon.png' },
  { path: rootPath('apps/admin/public/favicon.ico'), desc: 'Admin App favicon.ico' },

  // Chrome Extension Source
  { path: rootPath('apps/extension/icons/icon16.png'), desc: 'Chrome Extension icon16.png' },
  { path: rootPath('apps/extension/icons/icon48.png'), desc: 'Chrome Extension icon48.png' },
  { path: rootPath('apps/extension/icons/icon128.png'), desc: 'Chrome Extension icon128.png' },
  { path: rootPath('apps/extension/assets/logo.png'), desc: 'Chrome Extension logo.png' },

  // Generated extension copy in web app
  { path: rootPath('apps/web/public/chrome_extension/icons/icon16.png'), desc: 'Generated Extension icon16.png' },
  { path: rootPath('apps/web/public/chrome_extension/icons/icon48.png'), desc: 'Generated Extension icon48.png' },
  { path: rootPath('apps/web/public/chrome_extension/icons/icon128.png'), desc: 'Generated Extension icon128.png' },
  { path: rootPath('apps/web/public/chrome_extension/assets/logo.png'), desc: 'Generated Extension logo.png' }
];

async function run() {
  console.log('--- STARTING LOGO & SEO ASSET AUDIT ---');
  let failures = [];
  let successes = [];

  // Check file existences & sizes
  for (const item of filesToAudit) {
    if (!fs.existsSync(item.path)) {
      failures.push(`Missing File: ${item.desc} (at ${item.path})`);
    } else {
      const stats = fs.statSync(item.path);
      const sizeKB = stats.size / 1024;
      if (stats.size === 0) {
        failures.push(`Empty File: ${item.desc} size is 0 bytes`);
      } else if (sizeKB > 1024) {
        failures.push(`Size Warning: ${item.desc} is ${(sizeKB / 1024).toFixed(2)} MB (exceeds 1 MB limit)`);
      } else {
        successes.push(`${item.desc}: Valid. Size = ${sizeKB.toFixed(2)} KB`);
      }
    }
  }

  // Check static sitemap content
  const sitemapPath = rootPath('apps/marketing/public/sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    if (!sitemapContent.includes('<loc>https://www.sellersuit.com</loc>')) {
      failures.push('Sitemap Error: Missing homepage URL');
    }
    if (!sitemapContent.includes('<loc>https://www.sellersuit.com/pricing</loc>')) {
      failures.push('Sitemap Error: Missing pricing URL');
    }
    if (!sitemapContent.includes('<loc>https://www.sellersuit.com/documentation</loc>')) {
      failures.push('Sitemap Error: Missing documentation URL');
    }
  }

  // Print results
  console.log('\n--- AUDIT RESULTS ---');
  console.log(`Successes: ${successes.length}/${filesToAudit.length}`);
  if (failures.length > 0) {
    console.log(`❌ Failures (${failures.length}):`);
    for (const fail of failures) {
      console.log(`  - ${fail}`);
    }
    process.exit(1);
  } else {
    console.log('✅ All checked files are present, valid in size, and non-empty.');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Audit crashed:', err);
  process.exit(1);
});
