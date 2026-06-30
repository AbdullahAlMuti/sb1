import fs from 'fs';
import path from 'path';

const DIST_DIR = path.resolve('./dist/extension-dev');
const ROOT_ENV_PATH = path.resolve('../../.env.local');
const ENV_PATH = fs.existsSync(ROOT_ENV_PATH) ? ROOT_ENV_PATH : path.resolve('../../.env');

const env = loadEnvFile(ENV_PATH);
const appUrl = env.APP_URL || 'http://localhost:3001';
const marketingUrl = env.MARKETING_APP_URL || env.VITE_MARKETING_URL || 'http://localhost:3000';
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || 'local-anon-key';
const supabaseFunctionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;

const failures = [];

function read(relativePath) {
  const filePath = path.join(DIST_DIR, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing dev artifact: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

const manifest = JSON.parse(read('manifest.json') || '{}');
const config = read('common/config.js');
const constants = read('common/constants.js');
const background = read('build/background.bundle.js');

expect(manifest.homepage_url === appUrl, `manifest homepage_url must be ${appUrl}`);
expect(config.includes(`const WEB_APP_DOMAIN = '${appUrl}';`), `common/config.js must use ${appUrl}`);
expect(config.includes(`SUPABASE_URL: '${supabaseUrl}',`), `common/config.js must use ${supabaseUrl}`);
expect(
  config.includes(`SUPABASE_FUNCTIONS: '${supabaseFunctionsUrl}',`),
  `common/config.js must use ${supabaseFunctionsUrl}`
);
expect(config.includes(`SUPABASE_ANON: '${supabaseAnonKey}'`), 'common/config.js must use the same Supabase anon/publishable key as web/admin');
expect(constants.includes(`const WEB_BASE_URL = '${marketingUrl}';`), `common/constants.js must use ${marketingUrl}`);

expect(background.includes(`const WEB_APP_DOMAIN = ${JSON.stringify(appUrl)};`), `background bundle must use ${appUrl}`);
expect(background.includes(`SUPABASE_URL: ${JSON.stringify(supabaseUrl)},`), `background bundle must use ${supabaseUrl}`);
expect(
  background.includes(`SUPABASE_FUNCTIONS: ${JSON.stringify(supabaseFunctionsUrl)},`),
  `background bundle must use ${supabaseFunctionsUrl}`
);
expect(background.includes(`SUPABASE_ANON: ${JSON.stringify(supabaseAnonKey)}`), 'background bundle must use the same Supabase anon/publishable key as web/admin');
expect(background.includes(`WEB_BASE_URL: ${JSON.stringify(marketingUrl)}`), `background bundle must use ${marketingUrl}`);
expect(!background.includes('const WEB_APP_DOMAIN = "https://sellersuit.com";'), 'background bundle must not inline production WEB_APP_DOMAIN');
expect(!background.includes('WEB_BASE_URL: "https://sellersuit.com"'), 'background bundle must not inline production WEB_BASE_URL');
expect(!background.includes('https://sellersuit.com'), 'background bundle must not contain production sellersuit.com URLs');

if (failures.length > 0) {
  console.error('❌ Development extension verification FAILED:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('✅ Development extension verification PASSED.');

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const parsed = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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
    parsed[key] = value;
  }
  return parsed;
}
