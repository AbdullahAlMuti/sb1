import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('.');
const DIST_DIR = path.resolve('./dist/extension-dev');
const ROOT_ENV_PATH = path.resolve('../../.env.local');

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
  'scripts',
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
    if (entry.name.endsWith('.cjs') || entry.name.endsWith('.md') || entry.name === 'debug-logs.txt') continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSyncSafe(srcPath, destPath);
    }
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

console.log('Building Development Extension...');

// 1. Clean dist dir
if (fs.existsSync(DIST_DIR)) {
  try {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  } catch (err) {
    console.warn('⚠️ Warning: Could not clean dist directory completely (some files may be locked). Proceeding...');
  }
}

// 2. Copy all files
copyDir(SRC_DIR, DIST_DIR);

// 3. Override with DEV templates
copyFileSyncSafe(path.join(SRC_DIR, 'manifest.dev.json'), path.join(DIST_DIR, 'manifest.json'));
copyFileSyncSafe(path.join(SRC_DIR, 'common', 'config.dev.js'), path.join(DIST_DIR, 'common', 'config.js'));

// 4. Rewrite the dev config from the repo root .env.local when available.
const ENV_PATH = fs.existsSync(ROOT_ENV_PATH) ? ROOT_ENV_PATH : path.resolve('../../.env');
const env = loadEnvFile(ENV_PATH);
const appUrl = env.APP_URL || 'http://localhost:3001';
const marketingUrl = env.MARKETING_APP_URL || env.VITE_MARKETING_URL || 'http://localhost:3000';
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey =
  env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || 'local-anon-key';
const supabaseFunctionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;

const configPath = path.join(DIST_DIR, 'common', 'config.js');
let configContents = fs.readFileSync(configPath, 'utf8');
configContents = configContents.replace(
  /const WEB_APP_DOMAIN = '.*?';/,
  `const WEB_APP_DOMAIN = '${appUrl}';`
);
configContents = configContents.replace(
  /SUPABASE_URL: '.*?',/,
  `SUPABASE_URL: '${supabaseUrl}',`
);
configContents = configContents.replace(
  /SUPABASE_FUNCTIONS: '.*?',/,
  `SUPABASE_FUNCTIONS: '${supabaseFunctionsUrl}',`
);
configContents = configContents.replace(
  /SUPABASE_ANON: '.*?'/,
  `SUPABASE_ANON: '${supabaseAnonKey}'`
);
fs.writeFileSync(configPath, configContents);

// 5. Rewrite WEB_BASE_URL in constants.js to use marketingUrl
const constantsPath = path.join(DIST_DIR, 'common', 'constants.js');
let constantsContents = fs.readFileSync(constantsPath, 'utf8');
constantsContents = constantsContents.replace(
  /const WEB_BASE_URL = 'https:\/\/sellersuit\.com';/g,
  `const WEB_BASE_URL = '${marketingUrl}';`
);
fs.writeFileSync(constantsPath, constantsContents);

console.log(`✅ Development build ready in: ${DIST_DIR}`);
