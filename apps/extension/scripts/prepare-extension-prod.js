import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('.');
const DIST_DIR = path.resolve('./dist/extension-prod');

const IGNORE_LIST = [
  'dist',
  'node_modules',
  '.git',
  'scripts',
  'manifest.dev.json',
  'manifest.prod.json',
  '.env',
  'package.json',
  'package-lock.json',
  'fix_ui.js'
];

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORE_LIST.includes(entry.name)) continue;
    if (entry.name.endsWith('.dev.js') || entry.name.endsWith('.prod.js')) continue;
    if (entry.name.endsWith('.cjs') || entry.name.endsWith('.md') || entry.name === 'debug-logs.txt') continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Building Production Extension...');

// 1. Clean dist dir
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}

// 2. Copy all files
copyDir(SRC_DIR, DIST_DIR);

// 3. Override with PROD templates
fs.copyFileSync(path.join(SRC_DIR, 'manifest.prod.json'), path.join(DIST_DIR, 'manifest.json'));
fs.copyFileSync(path.join(SRC_DIR, 'common', 'config.prod.js'), path.join(DIST_DIR, 'common', 'config.js'));

console.log(`✅ Production build ready in: ${DIST_DIR}`);

// 4. Sync to web dashboard public assets
const WEB_PUBLIC_DIR = path.resolve('../../apps/web/public/chrome_extension');
if (fs.existsSync(WEB_PUBLIC_DIR)) {
  console.log('Syncing clean production build to web public assets...');
  fs.rmSync(WEB_PUBLIC_DIR, { recursive: true, force: true });
  fs.mkdirSync(WEB_PUBLIC_DIR, { recursive: true });
  
  function copyFolderRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyFolderRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyFolderRecursive(DIST_DIR, WEB_PUBLIC_DIR);
  console.log(`✅ Synced to: ${WEB_PUBLIC_DIR}`);

  // 5. Generate files.json listing all files in WEB_PUBLIC_DIR
  const fileList = [];
  function collectFiles(dir, baseDir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(fullPath, baseDir);
      } else {
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        if (relPath !== 'files.json' && relPath !== 'README.txt') {
          fileList.push(relPath);
        }
      }
    }
  }
  collectFiles(WEB_PUBLIC_DIR, WEB_PUBLIC_DIR);
  fs.writeFileSync(path.join(WEB_PUBLIC_DIR, 'files.json'), JSON.stringify(fileList, null, 2));
  console.log(`✅ Generated files.json in: ${WEB_PUBLIC_DIR} (${fileList.length} files)`);
} else {
  console.log('⚠️ Web public directory not found, skipping sync.');
}

