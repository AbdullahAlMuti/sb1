import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(EXT_ROOT, 'suppliers', 'aliexpress', 'domains.generated.json');
const SEED_DOMAINS = ['aliexpress.com', 'aliexpress.ru', 'aliexpress.us'];
const args = new Set(process.argv.slice(2));
const offline = args.has('--offline');

function normalizeHost(value) {
  try {
    const raw = String(value || '').trim().toLowerCase();
    const host = raw.includes('://') ? new URL(raw).hostname : raw;
    return host.replace(/^www\./, '').replace(/^m\./, '');
  } catch (_) {
    return '';
  }
}

function isOfficialAliExpressDomain(host) {
  return /^([a-z0-9-]+\.)?aliexpress\.[a-z.]+$/i.test(host);
}

async function discoverFromSearch() {
  if (offline) return [];
  const queries = [
    'https://www.bing.com/search?q=site%3Aaliexpress.com%2Fitem%2F+AliExpress',
    'https://www.bing.com/search?q=site%3Aaliexpress.ru%2Fitem%2F+AliExpress',
    'https://www.bing.com/search?q=site%3Aaliexpress.us%2Fitem%2F+AliExpress',
  ];
  const found = new Set();
  for (const url of queries) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'SellerSuit-domain-discovery/1.0' } });
      if (!res.ok) continue;
      const html = await res.text();
      for (const match of html.matchAll(/https?:\/\/([a-z0-9.-]*aliexpress\.[a-z.]+)\/item\//gi)) {
        const host = normalizeHost(match[1]);
        if (isOfficialAliExpressDomain(host)) found.add(host);
      }
    } catch (err) {
      console.warn(`Search discovery skipped: ${err.message}`);
    }
  }
  return Array.from(found);
}

async function validatesProductPages(domain) {
  if (offline) return true;
  const probeUrl = `https://www.${domain}/item/1005006867156228.html`;
  try {
    const res = await fetch(probeUrl, {
      redirect: 'follow',
      headers: { 'user-agent': 'SellerSuit-domain-discovery/1.0' },
    });
    const finalHost = normalizeHost(res.url);
    if (!isOfficialAliExpressDomain(finalHost)) return false;
    const html = await res.text();
    return /\/item\/\d+\.html/i.test(res.url) && /product|sku|price|image|AliExpress/i.test(html);
  } catch (err) {
    console.warn(`Validation skipped for ${domain}: ${err.message}`);
    return SEED_DOMAINS.includes(domain);
  }
}

async function main() {
  const candidates = new Set(SEED_DOMAINS);
  const envCandidates = (process.env.ALIEXPRESS_DOMAIN_CANDIDATES || '')
    .split(',')
    .map(normalizeHost)
    .filter(Boolean);
  for (const domain of envCandidates) candidates.add(domain);
  for (const domain of await discoverFromSearch()) candidates.add(domain);

  const domains = [];
  for (const domain of Array.from(candidates).sort()) {
    if (!isOfficialAliExpressDomain(domain)) continue;
    if (await validatesProductPages(domain)) domains.push(domain);
  }

  const registry = {
    generatedAt: new Date().toISOString(),
    source: offline
      ? 'Offline SellerSuit AliExpress seed registry.'
      : 'Search-assisted SellerSuit AliExpress product-domain discovery.',
    domains,
    imageHosts: ['*.alicdn.com'],
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(registry, null, 2) + '\n');
  console.log(`Discovered AliExpress domains: ${domains.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
