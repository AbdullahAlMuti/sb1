import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(__dirname, '..');
const REGISTRY_JSON = path.join(EXT_ROOT, 'suppliers', 'aliexpress', 'domains.generated.json');
const REGISTRY_JS = path.join(EXT_ROOT, 'suppliers', 'aliexpress', 'domains.generated.js');
const MANIFESTS = ['manifest.json', 'manifest.dev.json', 'manifest.prod.json'];
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');

function readRegistry() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_JSON, 'utf8'));
  const domains = Array.from(
    new Set((registry.domains || []).map((domain) => String(domain).trim().toLowerCase()).filter(Boolean))
  ).sort();
  const imageHosts = Array.from(
    new Set((registry.imageHosts || []).map((host) => String(host).trim().toLowerCase()).filter(Boolean))
  ).sort();
  if (!domains.length) throw new Error('AliExpress registry has no domains');
  return { ...registry, domains, imageHosts };
}

function productPatterns(domains) {
  return domains.flatMap((domain) => [`*://${domain}/*`, `*://*.${domain}/*`]);
}

function imagePatterns(imageHosts) {
  return imageHosts.map((host) => `*://${host}/*`);
}

function addUnique(list, items) {
  const out = Array.isArray(list) ? [...list] : [];
  for (const item of items) {
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

function syncManifest(manifest, registry) {
  const matches = productPatterns(registry.domains);
  const hostPermissions = [...matches, ...imagePatterns(registry.imageHosts)];
  const next = JSON.parse(JSON.stringify(manifest));

  next.host_permissions = addUnique(next.host_permissions, hostPermissions);

  const aliScript = {
    matches,
    js: ['build/aliexpress.bundle.js'],
    css: ['ui/panel.css', 'ui/listing-card.css'],
    run_at: 'document_idle',
  };

  const scripts = Array.isArray(next.content_scripts) ? next.content_scripts : [];
  const existingIndex = scripts.findIndex((entry) =>
    Array.isArray(entry.js) && entry.js.includes('build/aliexpress.bundle.js')
  );
  if (existingIndex >= 0) {
    scripts[existingIndex] = aliScript;
  } else {
    const walmartIndex = scripts.findIndex((entry) =>
      Array.isArray(entry.js) && entry.js.includes('build/walmart.bundle.js')
    );
    scripts.splice(walmartIndex >= 0 ? walmartIndex + 1 : scripts.length, 0, aliScript);
  }
  next.content_scripts = scripts;

  if (Array.isArray(next.web_accessible_resources)) {
    next.web_accessible_resources = next.web_accessible_resources.map((entry, index) => {
      if (index !== 0 || !Array.isArray(entry.matches)) return entry;
      return { ...entry, matches: addUnique(entry.matches, matches) };
    });
  }

  return next;
}

function writeGeneratedJs(registry) {
  const quote = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const arrayLiteral = (values) => `[${values.map(quote).join(', ')}]`;
  const contents = `// domains.generated.js - generated AliExpress product domain registry.
// Source of truth: suppliers/aliexpress/domains.generated.json

window.SSAliExpressDomains = {
  generatedAt: ${quote(registry.generatedAt || new Date().toISOString())},
  domains: ${arrayLiteral(registry.domains)},
  imageHosts: ${arrayLiteral(registry.imageHosts)},
};
`;
  if (!checkOnly) fs.writeFileSync(REGISTRY_JS, contents);
  return contents;
}

function main() {
  const registry = readRegistry();
  let changed = false;

  const generatedJs = writeGeneratedJs(registry);
  if (checkOnly && fs.existsSync(REGISTRY_JS)) {
    const currentJs = fs.readFileSync(REGISTRY_JS, 'utf8');
    if (currentJs !== generatedJs) {
      console.error('AliExpress generated JS registry is out of sync.');
      changed = true;
    }
  }

  for (const manifestName of MANIFESTS) {
    const manifestPath = path.join(EXT_ROOT, manifestName);
    const currentText = fs.readFileSync(manifestPath, 'utf8');
    const current = JSON.parse(currentText);
    const next = syncManifest(current, registry);
    const nextText = JSON.stringify(next, null, 2) + '\n';
    if (currentText !== nextText) {
      changed = true;
      if (checkOnly) {
        console.error(`${manifestName} is missing generated AliExpress entries.`);
      } else {
        fs.writeFileSync(manifestPath, nextText);
        console.log(`Synced ${manifestName}`);
      }
    }
  }

  if (checkOnly && changed) process.exit(1);
  if (!changed) console.log('AliExpress manifests are already synced.');
}

main();
