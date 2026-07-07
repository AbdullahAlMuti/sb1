// manifest-parity.test.js — dev/prod manifest parity lock.
//
// Three manifests exist: manifest.json (unpacked-from-repo dev), manifest.dev.json
// (template copied into dist/extension-dev by prepare:dev), manifest.prod.json
// (template for dist/extension-prod). The dev builds must exercise the same
// injection surface prod ships: before 2026-07-07 manifest.json matched only
// www.amazon.com, lacked the ebay_draft_sku_guard block entirely, and missed the
// international eBay success pages, while manifest.dev.json was missing three
// web-accessible resources — so prod-only surface was untestable in dev.
// Invariant: each dev manifest = manifest.prod.json + local-dev additions
// (localhost/127.0.0.1 URLs, localhost homepage_url), nothing more.
//
// Run: node --test apps/extension/tests/manifest-parity.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = join(__dirname, '..');

const load = (f) => JSON.parse(readFileSync(join(EXT_ROOT, f), 'utf8'));
const prod = load('manifest.prod.json');
const DEV_MANIFESTS = [
  ['manifest.json', load('manifest.json')],
  ['manifest.dev.json', load('manifest.dev.json')],
];

const blockKey = (cs) => cs.js.join('|');
const isLocal = (m) => m.includes('localhost') || m.includes('127.0.0.1');

for (const [name, dev] of DEV_MANIFESTS) {
  describe(`${name} covers the full prod injection surface`, () => {
    test('every prod content-script block exists with identical js and all prod matches', () => {
      const devByKey = Object.fromEntries(dev.content_scripts.map((cs) => [blockKey(cs), cs]));
      for (const cs of prod.content_scripts) {
        const d = devByKey[blockKey(cs)];
        assert.ok(d, `${name} missing content-script block: ${blockKey(cs)}`);
        for (const m of cs.matches) {
          assert.ok(d.matches.includes(m), `${name} block [${cs.js[cs.js.length - 1]}] missing match ${m}`);
        }
        assert.equal(d.run_at, cs.run_at, `run_at differs for block ${blockKey(cs)}`);
      }
    });

    test('host_permissions and permissions cover prod', () => {
      for (const h of prod.host_permissions) {
        assert.ok(dev.host_permissions.includes(h), `${name} host_permissions missing ${h}`);
      }
      assert.deepEqual([...dev.permissions].sort(), [...prod.permissions].sort(), 'permissions must be identical');
    });

    test('web_accessible_resources expose the same files', () => {
      assert.deepEqual(
        dev.web_accessible_resources[0].resources,
        prod.web_accessible_resources[0].resources,
        `${name} WAR resources must match prod`
      );
      for (const m of prod.web_accessible_resources[0].matches) {
        assert.ok(dev.web_accessible_resources[0].matches.includes(m), `${name} WAR missing match ${m}`);
      }
    });

    test('version stays in lockstep', () => {
      assert.equal(dev.version, prod.version, `bump ${name} and manifest.prod.json together`);
    });

    test('dev-only additions are limited to local-dev URLs', () => {
      const prodByKey = Object.fromEntries(prod.content_scripts.map((cs) => [blockKey(cs), cs]));
      for (const cs of dev.content_scripts) {
        const p = prodByKey[blockKey(cs)];
        assert.ok(p, `${name} dev-only content-script block not allowed: ${blockKey(cs)}`);
        const extras = cs.matches.filter((m) => !p.matches.includes(m) && !isLocal(m));
        assert.deepEqual(extras, [], `${name} block [${cs.js[cs.js.length - 1]}] has non-local extras`);
      }
      const hostExtras = dev.host_permissions.filter((h) => !prod.host_permissions.includes(h) && !isLocal(h));
      assert.deepEqual(hostExtras, [], `${name} host_permissions has non-local extras`);
      const warExtras = dev.web_accessible_resources[0].matches.filter(
        (m) => !prod.web_accessible_resources[0].matches.includes(m) && !isLocal(m)
      );
      assert.deepEqual(warExtras, [], `${name} WAR matches has non-local extras`);
    });
  });
}
