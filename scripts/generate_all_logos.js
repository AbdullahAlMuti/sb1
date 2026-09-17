import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

// Helper to define absolute paths relative to root
const rootPath = (...args) => resolve(ROOT_DIR, ...args);

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const masterLogoPath = rootPath('packages/ui/src/brand/logo.png');
  const masterBase64 = fs.readFileSync(masterLogoPath).toString('base64');
  const dataUri = `data:image/png;base64,${masterBase64}`;

  async function resizeImage(targetSize) {
    const pngBase64 = await page.evaluate(async ({ dataUri, targetSize }) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetSize, targetSize);
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        img.src = dataUri;
      });
    }, { dataUri, targetSize });

    return Buffer.from(pngBase64, 'base64');
  }

  function createIco(images) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(images.length, 4);

    let offset = 6 + (images.length * 16);
    const entries = [];
    const datas = [];

    for (const img of images) {
      const entry = Buffer.alloc(16);
      entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
      entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
      entry.writeUInt8(0, 2);
      entry.writeUInt8(0, 3);
      entry.writeUInt16LE(1, 4);
      entry.writeUInt16LE(32, 6);
      entry.writeUInt32LE(img.buffer.length, 8);
      entry.writeUInt32LE(offset, 12);

      entries.push(entry);
      datas.push(img.buffer);
      offset += img.buffer.length;
    }

    return Buffer.concat([header, ...entries, ...datas]);
  }

  console.log('Generating crisp favicon assets from master logo.png...');
  const png16 = await resizeImage(16);
  const png32 = await resizeImage(32);
  const png48 = await resizeImage(48);
  const png96 = await resizeImage(96);
  const png128 = await resizeImage(128);
  const png180 = await resizeImage(180);

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 }
  ]);

  const appDirs = [
    rootPath('apps/marketing/public'),
    rootPath('apps/web/public'),
    rootPath('apps/admin/public')
  ];

  for (const dir of appDirs) {
    fs.writeFileSync(resolve(dir, 'favicon.ico'), icoBuffer);
    fs.writeFileSync(resolve(dir, 'favicon.png'), png96);
    fs.writeFileSync(resolve(dir, 'apple-touch-icon.png'), png180);
  }

  fs.writeFileSync(rootPath('apps/extension/icons/icon16.png'), png16);
  fs.writeFileSync(rootPath('apps/extension/icons/icon48.png'), png48);
  fs.writeFileSync(rootPath('apps/extension/icons/icon128.png'), png128);

  const servedExtDir = rootPath('apps/web/public/chrome_extension/icons');
  if (fs.existsSync(servedExtDir)) {
    fs.writeFileSync(resolve(servedExtDir, 'icon16.png'), png16);
    fs.writeFileSync(resolve(servedExtDir, 'icon48.png'), png48);
    fs.writeFileSync(resolve(servedExtDir, 'icon128.png'), png128);
  }

  await browser.close();
  console.log('✅ All logo and icon assets generated successfully.');
}

run().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
