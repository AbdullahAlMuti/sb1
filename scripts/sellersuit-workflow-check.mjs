import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mode = arg('--mode') || 'analysis';
const failures = [];
const warnings = [];

if (!['analysis', 'local', 'prod'].includes(mode)) {
  fail(`Unknown mode "${mode}". Use analysis, local, or prod.`);
}

const required = [
  'apps/web',
  'apps/extension',
  'apps/admin',
  'apps/marketing',
  'packages',
  'supabase/functions',
  'supabase/migrations',
  'apps/extension/manifest.dev.json',
  'apps/extension/manifest.prod.json',
  'apps/extension/common/config.dev.js',
  'apps/extension/common/config.prod.js',
  'packages/api-client/src/supabase/client.ts',
  'apps/web/src/App.tsx',
  'apps/extension/sidepanel/panel-main.js',
];

for (const relativePath of required) {
  if (!exists(relativePath)) failures.push(`Missing required path: ${relativePath}`);
}

const rootPackage = json('package.json');
for (const script of ['dev:marketing', 'dev:web', 'dev:admin', 'dev:extension', 'dev:local', 'env:check:local', 'check:edge-functions']) {
  if (!rootPackage.scripts?.[script]) failures.push(`Missing root npm script: ${script}`);
}
checkReleaseScriptOrder(rootPackage.scripts || {});

const devManifestText = text('apps/extension/manifest.dev.json');
const prodManifestText = text('apps/extension/manifest.prod.json');
const prodManifest = json('apps/extension/manifest.prod.json');
const prodConfig = text('apps/extension/common/config.prod.js');
const webApp = text('apps/web/src/App.tsx');
const apiClient = text('packages/api-client/src/supabase/client.ts');
const sidePanel = text('apps/extension/sidepanel/panel-main.js');

if (!devManifestText.includes('localhost')) {
  failures.push('manifest.dev.json must include localhost permissions for local testing.');
}

if (/localhost|127\.0\.0\.1|<all_urls>/.test(prodManifestText)) {
  failures.push('manifest.prod.json contains localhost, 127.0.0.1, or <all_urls>.');
}

if (!has(prodManifest.host_permissions, 'https://sellersuit.com/*')) {
  failures.push('manifest.prod.json must include https://sellersuit.com/* host permission.');
}

if (!prodManifest.content_scripts?.some((entry) => has(entry.matches, 'https://sellersuit.com/*'))) {
  failures.push('manifest.prod.json must inject the dashboard bridge on https://sellersuit.com/*.');
}

if (!prodConfig.includes('https://sellersuit.com') || /localhost|127\.0\.0\.1|DEBUG(?:_MODE)?\s*:\s*true/.test(prodConfig)) {
  failures.push('common/config.prod.js must use https://sellersuit.com and contain no local/debug targets.');
}

if (!webApp.includes('import.meta.env.VITE_ADMIN_URL')) {
  failures.push('apps/web/src/App.tsx must derive the admin URL from VITE_ADMIN_URL.');
}

if (!webApp.includes('import.meta.env.VITE_MARKETING_URL')) {
  failures.push('apps/web/src/App.tsx must derive the marketing URL from VITE_MARKETING_URL.');
}

if (!apiClient.includes('import.meta.env.VITE_SUPABASE_URL')) {
  failures.push('API client must derive the API target from VITE_SUPABASE_URL.');
}

if (!sidePanel.includes('ExtensionConfig.URLS.WEB_APP_BASE') || !sidePanel.includes('/auth')) {
  failures.push('sidepanel/panel-main.js must use configured WEB_APP_BASE for auth navigation.');
}

if (mode === 'local') {
  checkLocalEnv();
  checkDevArtifacts();
}
if (mode === 'prod') checkProdArtifacts();

printMap();

if (warnings.length) {
  console.warn('\nSellerSuit workflow warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error('\nSellerSuit workflow check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\nSellerSuit workflow check passed (${mode}).`);

function checkLocalEnv() {
  if (!exists('.env.local')) {
    failures.push('Missing .env.local. Copy .env.local.example before local QA.');
    return;
  }

  const env = parseEnv(text('.env.local'));
  for (const name of [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_URL',
    'APP_URL',
    'PUBLIC_APP_URL',
    'MARKETING_APP_URL',
    'ADMIN_APP_URL',
    'ENVIRONMENT',
  ]) {
    if (!env[name]) failures.push(`.env.local is missing ${name}.`);
  }

  if ((env.ENVIRONMENT || '').toLowerCase() === 'production') {
    failures.push('.env.local cannot set ENVIRONMENT=production.');
  }

  if ((env.STRIPE_SECRET_KEY || '').startsWith('sk_live_')) {
    failures.push('.env.local cannot contain a live Stripe secret key.');
  }

  for (const name of ['APP_URL', 'PUBLIC_APP_URL', 'MARKETING_APP_URL', 'ADMIN_APP_URL']) {
    const value = env[name] || '';
    if (value && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(value)) {
      warnings.push(`${name} is not localhost. Use only a non-production staging URL for local QA.`);
    }
  }
}

function checkReleaseScriptOrder(scripts) {
  if (!scriptHasBefore(scripts['qa:local'], 'check:workflow:local', 'check:local')) {
    failures.push('qa:local must start with the local workflow check before the local QA gate.');
  }
  if (!scriptHasBefore(scripts['qa:local'], 'check:local', 'check:extension')) {
    failures.push('qa:local must run check:local before extension checks.');
  }
  if (!scriptHasBefore(scripts['qa:local'], 'check:extension', 'prepare:extension:dev')) {
    failures.push('qa:local must prepare extension-dev only after extension checks pass.');
  }
  if (!scriptHasBefore(scripts['prepare:extension:prod'], 'prepare:extension:dev', 'prepare:prod')) {
    failures.push('prepare:extension:prod must prepare and verify extension-dev before creating production artifacts.');
  }
  if (!scriptHasBefore(scripts['release:extension'], 'qa:local', 'prepare:extension:prod')) {
    failures.push('release:extension must run qa:local before production extension preparation.');
  }
  if (!scripts['release:ready']?.includes('release:extension')) {
    failures.push('release:ready must delegate to release:extension so local-first gates cannot be bypassed.');
  }
}

function scriptHasBefore(script, first, second) {
  if (!script) return false;
  const firstIndex = script.indexOf(first);
  const secondIndex = script.indexOf(second);
  return firstIndex !== -1 && secondIndex !== -1 && firstIndex < secondIndex;
}

function checkDevArtifacts() {
  const env = exists('.env.local') ? parseEnv(text('.env.local')) : {};
  const appUrl = env.APP_URL || 'http://localhost:3001';
  const marketingUrl = env.MARKETING_APP_URL || env.VITE_MARKETING_URL || 'http://localhost:3000';
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseFunctionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;

  const devManifestPath = 'apps/extension/dist/extension-dev/manifest.json';
  const devConfigPath = 'apps/extension/dist/extension-dev/common/config.js';
  const devConstantsPath = 'apps/extension/dist/extension-dev/common/constants.js';
  const devBackgroundPath = 'apps/extension/dist/extension-dev/build/background.bundle.js';

  for (const relativePath of [devManifestPath, devConfigPath, devConstantsPath, devBackgroundPath]) {
    if (!exists(relativePath)) {
      failures.push(`Missing development artifact: ${relativePath}`);
    }
  }

  if (!exists(devBackgroundPath)) return;

  const manifest = exists(devManifestPath) ? json(devManifestPath) : {};
  const config = text(devConfigPath);
  const constants = text(devConstantsPath);
  const background = text(devBackgroundPath);

  if (manifest.homepage_url !== appUrl) {
    failures.push(`extension-dev manifest homepage_url must be ${appUrl}.`);
  }
  if (!config.includes(`const WEB_APP_DOMAIN = '${appUrl}';`)) {
    failures.push(`extension-dev common/config.js must use ${appUrl}.`);
  }
  if (!config.includes(`SUPABASE_FUNCTIONS: '${supabaseFunctionsUrl}',`)) {
    failures.push(`extension-dev common/config.js must use ${supabaseFunctionsUrl}.`);
  }
  if (!constants.includes(`const WEB_BASE_URL = '${marketingUrl}';`)) {
    failures.push(`extension-dev common/constants.js must use ${marketingUrl}.`);
  }
  if (!background.includes(`const WEB_APP_DOMAIN = ${JSON.stringify(appUrl)};`)) {
    failures.push(`extension-dev background.bundle.js must use ${appUrl}.`);
  }
  if (!background.includes(`SUPABASE_FUNCTIONS: ${JSON.stringify(supabaseFunctionsUrl)},`)) {
    failures.push(`extension-dev background.bundle.js must use ${supabaseFunctionsUrl}.`);
  }
  if (!background.includes(`WEB_BASE_URL: ${JSON.stringify(marketingUrl)}`)) {
    failures.push(`extension-dev background.bundle.js must use ${marketingUrl}.`);
  }
  if (background.includes('const WEB_APP_DOMAIN = "https://sellersuit.com";')) {
    failures.push('extension-dev background.bundle.js still inlines production WEB_APP_DOMAIN.');
  }
  if (background.includes('WEB_BASE_URL: "https://sellersuit.com"')) {
    failures.push('extension-dev background.bundle.js still inlines production WEB_BASE_URL.');
  }
  if (background.includes('https://sellersuit.com')) {
    failures.push('extension-dev background.bundle.js must not contain production sellersuit.com URLs.');
  }
}

function checkProdArtifacts() {
  for (const dir of ['apps/extension/dist/extension-prod', 'apps/web/public/chrome_extension']) {
    if (!exists(dir)) {
      failures.push(`Missing production artifact: ${dir}`);
      continue;
    }

    for (const filePath of walk(resolve(dir))) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const forbidden of ['localhost', '127.0.0.1', 'manifest.dev.json', 'DEBUG_MODE: true', 'DEBUG = true']) {
        if (content.includes(forbidden)) {
          failures.push(`Forbidden production string "${forbidden}" found in ${path.relative(root, filePath)}`);
        }
      }
    }
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git'].includes(entry.name)) yield* walk(fullPath);
    } else if (!/\.(png|jpg|jpeg|gif|ico|svg|webp|zip)$/i.test(entry.name)) {
      yield fullPath;
    }
  }
}

function printMap() {
  console.log(`SellerSuit workflow analysis (${mode})`);
  console.table([
    { surface: 'Marketing', local: 'http://localhost:3000', env: 'MARKETING_APP_URL / VITE_MARKETING_URL' },
    { surface: 'Web dashboard', local: 'http://localhost:3001', env: 'APP_URL / PUBLIC_APP_URL / VITE_APP_URL' },
    { surface: 'Admin', local: 'http://localhost:3002', env: 'ADMIN_APP_URL / VITE_ADMIN_URL' },
    { surface: 'Supabase', local: 'http://127.0.0.1:54321 or staging', env: 'SUPABASE_URL / VITE_SUPABASE_URL' },
    { surface: 'Functions API', local: '<SUPABASE_URL>/functions/v1', env: 'derived from SUPABASE_URL' },
    { surface: 'Extension dev build', local: 'apps/extension/dist/extension-dev', env: 'prepare:extension:dev' },
    { surface: 'Extension prod build', local: 'apps/extension/dist/extension-prod', env: 'prepare:extension:prod' },
  ]);
}

function parseEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function text(relativePath) {
  const filePath = resolve(relativePath);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function json(relativePath) {
  return JSON.parse(text(relativePath));
}

function exists(relativePath) {
  return fs.existsSync(resolve(relativePath));
}

function resolve(relativePath) {
  return path.resolve(root, relativePath);
}

function has(list, value) {
  return Array.isArray(list) && list.includes(value);
}

function arg(name) {
  const exact = process.argv.find((item) => item.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
