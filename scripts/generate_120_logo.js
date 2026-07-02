import { chromium } from 'playwright';
import fs from 'fs';

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
          width: 120px;
          height: 120px;
          overflow: hidden;
          background: transparent;
        }
        .logo-container {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        svg {
          width: 120px;
          height: 120px;
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
  
  await page.setViewportSize({ width: 120, height: 120 });
  await page.setContent(htmlContent);
  await page.waitForTimeout(100);

  const workspaceOutputPath = 'd:\\eBay Software\\2026sellersuit\\sb1\\sellersuit_logo_120x120.png';

  console.log('Taking screenshot with transparent background...');
  const buffer = await page.screenshot({ type: 'png', omitBackground: true });
  fs.writeFileSync(workspaceOutputPath, buffer);
  
  console.log(`Logo successfully saved to:\n- ${workspaceOutputPath}`);
  const stats = fs.statSync(workspaceOutputPath);
  console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);

  await browser.close();
}

run().catch(err => {
  console.error('Error rendering 120x120 logo:', err);
  process.exit(1);
});
