// design-tokens.test.js — one design system across every extension surface.
// Run: node --test apps/extension/tests/design-tokens.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { drifted, tokenBlock, TARGETS } from '../scripts/sync-design-tokens.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// Emoji used as UI icons render differently per OS and cannot be themed.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{2B06}\u{1F000}-\u{1F2FF}]/u;

describe('design tokens', () => {
  test('every stylesheet carries the current token block', () => {
    assert.deepEqual(drifted(), [], 'run: node scripts/sync-design-tokens.js');
  });

  test('the token block defines exactly one accent and six type sizes', () => {
    const block = tokenBlock();
    assert.match(block, /--ds-brand:\s*#2563eb/);
    const sizes = [...block.matchAll(/--ds-text-(2xs|xs|sm|md|lg|xl):\s*(\d+)px/g)].map(m => Number(m[2]));
    assert.deepEqual(sizes, [11, 12, 13, 14, 16, 20]);
  });

  test('each surface points its primary action at the brand token', () => {
    assert.match(read('sidepanel/side-panel.css'), /--primary:\s*var\(--ds-brand\)/);
    assert.match(read('ui/panel.css'), /--x-primary:\s*var\(--ds-brand\)/);
    assert.match(read('ui/editor-popup.css'), /--brand-primary:\s*var\(--ds-brand\)/);
  });

  test('every surface has a visible keyboard focus style and honours reduced motion', () => {
    for (const rel of TARGETS) {
      const css = read(rel);
      assert.match(css, /:focus-visible/, `${rel} has no :focus-visible rule`);
      assert.match(css, /prefers-reduced-motion/, `${rel} ignores prefers-reduced-motion`);
    }
  });
});

describe('no emoji icons in the interface markup', () => {
  for (const rel of ['sidepanel/side-panel.html', 'ui/editor_frame.html', 'ui/panel.html']) {
    test(rel, () => {
      const html = read(rel).replace(/<!--[\s\S]*?-->/g, '');
      const hit = html.match(EMOJI);
      const at = hit ? html.slice(Math.max(0, hit.index - 40), hit.index + 20).replace(/\s+/g, ' ') : '';
      assert.equal(hit, null, `emoji found near: …${at}…`);
    });
  }
});

describe('no emoji injected through CSS content', () => {
  for (const rel of TARGETS) {
    test(rel, () => {
      const css = read(rel).replace(/\/\*[\s\S]*?\*\//g, '');
      const rules = css.match(/content:\s*['"][^'"]*['"]/g) || [];
      const bad = rules.filter(r => EMOJI.test(r));
      // editor-popup.css keeps the legacy rule but the design-system layer disables it.
      if (rel === 'ui/editor-popup.css') {
        assert.match(css, /\.editor-header h3::before[^{]*\{\s*content:\s*none\s*!important/);
      } else {
        assert.deepEqual(bad, []);
      }
    });
  }
});
