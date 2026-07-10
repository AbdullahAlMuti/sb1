import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('.');
const DIST_DIR = path.resolve('./dist/extension-prod');

const IGNORE_LIST = [
  'dist',
  'node_modules',
  '.git',
  '.gitignore',
  '.prettierrc',
  'eslint.config.js',
  'jsconfig.json',
  'vite.config.js',
  'vite.config.amazon.js',
  'vite.config.walmart.js',
  'vite.config.aliexpress.js',
  'vite.config.background.js',
  'scripts',
  'tests',
  'manifest.dev.json',
  'manifest.prod.json',
  '.env',
  'package.json',
  'package-lock.json',
  'fix_ui.js'
];

function copyFileSyncSafe(src, dest) {
  let retries = 3;
  while (retries > 0) {
    try {
      fs.copyFileSync(src, dest);
      return;
    } catch (err) {
      if (err.code === 'EBUSY' && retries > 1) {
        retries--;
        const limit = Date.now() + 100;
        while (Date.now() < limit) {}
      } else {
        if (fs.existsSync(dest)) {
          console.warn(`⚠️ Warning: Could not overwrite locked file ${dest}, using existing version.`);
          return;
        }
        throw err;
      }
    }
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORE_LIST.includes(entry.name)) continue;
    if (entry.name.endsWith('.dev.js') || entry.name.endsWith('.prod.js')) continue;
    if (entry.name.endsWith('.cjs') || entry.name.endsWith('.md') || entry.name.endsWith('.map') || entry.name === 'debug-logs.txt') continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSyncSafe(srcPath, destPath);
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

// 4. Rewrite the dashboard bridge origin allowlist for production. The source
// bridge intentionally keeps localhost for daily development; the Chrome Store
// artifact must physically exclude local-only URLs.
const bridgePath = path.join(DIST_DIR, 'content_scripts', 'bridge.js');
let bridgeContents = fs.readFileSync(bridgePath, 'utf8');
bridgeContents = bridgeContents.replace(
  /const allowedOrigins = \[[\s\S]*?\];/,
  `const allowedOrigins = [
            'https://sellersuit.com',
            'https://www.sellersuit.com'
        ];`
);
fs.writeFileSync(bridgePath, bridgeContents);

// 4b. Strip the dev-only localhost sender trust from the message router.
// isTrustedAuthSender() accepts localhost/127.0.0.1 bridge senders so daily
// development works — but the store artifact must not trust local origins for
// auth-sensitive actions (SYNC_TOKEN / LOGIN_SUCCESS / LOGOUT), and verify:prod
// hard-fails on the literal strings. The check exists in the raw source file
// AND baked into the vite background bundle, so both dist copies are rewritten.
// Loud failure on a miss: if a refactor moves or renames the check, the build
// must break here rather than silently ship local-host trust to the store.
// Matches both the raw source shape (comment line + single quotes) and the
// vite bundle shape (comment stripped, double quotes, tab indentation).
const DEV_HOST_TRUST = /(?:[ \t]*\/\/ Dev only[^\n]*\n)?[ \t]*if \(host === ["']localhost["'] \|\| host === ["']127\.0\.0\.1["']\) return true;[ \t]*\r?\n/g;
const ROUTER_FILES = [
  path.join(DIST_DIR, 'background', 'message-router.js'),
  path.join(DIST_DIR, 'build', 'background.bundle.js'),
];
for (const routerPath of ROUTER_FILES) {
  if (!fs.existsSync(routerPath)) {
    console.error(`❌ Expected file missing from production build: ${routerPath}`);
    process.exit(1);
  }
  let contents = fs.readFileSync(routerPath, 'utf8');
  const before = contents;
  contents = contents.replace(
    DEV_HOST_TRUST,
    '    // (dev-only host trust stripped for production by prepare-extension-prod.js)\n'
  );
  if (contents === before) {
    console.error(`❌ Dev-only host-trust block not found in ${routerPath} — ` +
      'the pattern in prepare-extension-prod.js is out of sync with background/message-router.js.');
    process.exit(1);
  }
  if (contents.includes('localhost') || contents.includes('127.0.0.1')) {
    console.error(`❌ ${routerPath} still contains local-host strings after stripping — refusing to build.`);
    process.exit(1);
  }
  fs.writeFileSync(routerPath, contents);
}
console.log('✅ Stripped dev-only localhost sender trust from message router (source + bundle).');

console.log(`✅ Production build ready in: ${DIST_DIR}`);

// 5. Sync to web dashboard public assets
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

  // 6. Generate files.json listing all files in WEB_PUBLIC_DIR
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

