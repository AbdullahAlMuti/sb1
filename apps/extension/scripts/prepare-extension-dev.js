import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('.');
const DIST_DIR = path.resolve('./dist/extension-dev');
const ROOT_ENV_PATH = path.resolve('../../.env.local');

const IGNORE_LIST = [
  'dist',
  'node_modules',
  '.git',
  'scripts',
  'manifest.dev.json',
  'manifest.prod.json',
  '.env',
  'package.json',
  'package-lock.json'
];

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORE_LIST.includes(entry.name)) continue;
    if (entry.name.endsWith('.dev.js') || entry.name.endsWith('.prod.js')) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
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
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}

// 2. Copy all files
copyDir(SRC_DIR, DIST_DIR);

// 3. Override with DEV templates
fs.copyFileSync(path.join(SRC_DIR, 'manifest.dev.json'), path.join(DIST_DIR, 'manifest.json'));
fs.copyFileSync(path.join(SRC_DIR, 'common', 'config.dev.js'), path.join(DIST_DIR, 'common', 'config.js'));

// 4. Rewrite the dev config from the repo root .env.local when available.
const ENV_PATH = fs.existsSync(ROOT_ENV_PATH) ? ROOT_ENV_PATH : path.resolve('../../.env');
const env = loadEnvFile(ENV_PATH);
const appUrl = env.APP_URL || 'http://localhost:3001';
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

console.log(`✅ Development build ready in: ${DIST_DIR}`);
