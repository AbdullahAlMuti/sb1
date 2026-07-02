import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

// Helper to define absolute paths relative to root
const rootPath = (...args) => resolve(ROOT_DIR, ...args);

const targets = [
  // Marketing App Assets
  { path: rootPath('apps/marketing/public/favicon.png'), size: 96 },
  { path: rootPath('apps/marketing/public/logo.png'), size: 512 },
  { path: rootPath('apps/marketing/public/apple-touch-icon.png'), size: 180 },
  { path: rootPath('apps/marketing/public/favicon.ico'), size: 32 },

  // Web App Assets
  { path: rootPath('apps/web/public/favicon.png'), size: 96 },
  { path: rootPath('apps/web/public/logo.png'), size: 512 },
  { path: rootPath('apps/web/public/apple-touch-icon.png'), size: 180 },
  { path: rootPath('apps/web/public/favicon.ico'), size: 32 },

  // Admin App Assets
  { path: rootPath('apps/admin/public/favicon.png'), size: 96 },
  { path: rootPath('apps/admin/public/logo.png'), size: 512 },
  { path: rootPath('apps/admin/public/apple-touch-icon.png'), size: 180 },
  { path: rootPath('apps/admin/public/favicon.ico'), size: 32 },

  // Chrome Extension Assets
  { path: rootPath('apps/extension/icons/icon16.png'), size: 16 },
  { path: rootPath('apps/extension/icons/icon48.png'), size: 48 },
  { path: rootPath('apps/extension/icons/icon128.png'), size: 128 },
  { path: rootPath('apps/extension/assets/logo.png'), size: 512 },
];

async function run() {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * {
          box-sizing: border-box;
        }
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: transparent;
        }
        .logo-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        svg {
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="logo-container">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#0f172a" />
          <g transform="translate(16, 16) scale(1.25) translate(-16, -16)">
            <path
              d="M9 13C9 10.791 10.791 9 13 9h6.4c2.209 0 4 1.791 4 4v0c0 1.326-1.074 2.4-2.4 2.4H13c-2.209 0-4 1.791-4 4v0c0 2.209 1.791 4 4 4h6.4c2.209 0 4-1.791 4-4"
              stroke="white"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </g>
        </svg>
      </div>
    </body>
    </html>
  `;

  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(htmlContent);

  for (const target of targets) {
    console.log(`Rendering logo size ${target.size}x${target.size} for path: ${target.path}`);
    
    // Ensure parent directories exist
    const parentDir = dirname(target.path);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    await page.setViewportSize({ width: target.size, height: target.size });
    // Wait a brief moment for size adjustments to layout
    await page.waitForTimeout(50);
    
    const buffer = await page.screenshot({ type: 'png', omitBackground: true });
    fs.writeFileSync(target.path, buffer);
    
    const stats = fs.statSync(target.path);
    console.log(`Saved successfully. Size: ${(stats.size / 1024).toFixed(2)} KB`);
  }

  await browser.close();
  console.log('✅ All logo and icon assets generated successfully.');
}

run().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
