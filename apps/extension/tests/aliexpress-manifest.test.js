import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const registry = JSON.parse(readFileSync('suppliers/aliexpress/domains.generated.json', 'utf8'));
const manifestNames = ['manifest.json', 'manifest.dev.json', 'manifest.prod.json'];

function productPatterns() {
  return registry.domains.flatMap((domain) => [`*://${domain}/*`, `*://*.${domain}/*`]);
}

describe('AliExpress manifest integration', () => {
  for (const manifestName of manifestNames) {
    test(`${manifestName} includes AliExpress hosts and content script`, () => {
      const manifest = JSON.parse(readFileSync(manifestName, 'utf8'));
      const matches = productPatterns();
      for (const pattern of matches) {
        assert.ok(
          manifest.host_permissions.includes(pattern),
          `${pattern} host permission missing`
        );
      }
      assert.ok(manifest.host_permissions.includes('*://*.alicdn.com/*'));
      const contentScript = manifest.content_scripts.find((entry) =>
        entry.js?.includes('build/aliexpress.bundle.js')
      );
      assert.ok(contentScript, 'AliExpress content script missing');
      assert.deepEqual(contentScript.matches, matches);
      const webResource = manifest.web_accessible_resources[0];
      for (const pattern of matches) {
        assert.ok(webResource.matches.includes(pattern), `${pattern} web accessible match missing`);
      }
    });
  }

  test('sync script check mode passes', () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/sync-aliexpress-manifests.mjs', '--check'],
      {
        encoding: 'utf8',
      }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});
