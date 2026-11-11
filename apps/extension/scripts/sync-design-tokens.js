// sync-design-tokens.js — copies the design-token block from ui/tokens.css into
// every stylesheet that needs it.
//
// Why copy instead of @import: the full editor's stylesheet (ui/panel.css) is
// fetched as text and injected into supplier pages as an inline <style>, where a
// relative @import would resolve against amazon.com. Each stylesheet therefore
// carries its own copy between the ds-tokens markers. tests/design-tokens.test.js
// fails if a copy drifts from the source.
//
// Usage: node scripts/sync-design-tokens.js          (write)
//        node scripts/sync-design-tokens.js --check  (exit 1 on drift)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = 'ui/tokens.css';
export const TARGETS = [
  'sidepanel/side-panel.css',
  'ui/panel.css',
  'ui/editor-popup.css',
  'ui/listing-card.css',
];
const START = '/* ds-tokens:start';
const END = '/* ds-tokens:end */';

const norm = (s) => s.replace(/\r\n/g, '\n');

export function tokenBlock() {
  const src = norm(readFileSync(join(ROOT, SOURCE), 'utf8'));
  const a = src.indexOf(START);
  const b = src.indexOf(END);
  if (a < 0 || b < 0) throw new Error(`${SOURCE} is missing the ds-tokens markers`);
  return src.slice(a, b + END.length);
}

/** Returns the file content with the token block inserted/replaced at the top. */
export function withTokens(content, block) {
  const text = norm(content);
  const a = text.indexOf(START);
  const b = text.indexOf(END);
  if (a >= 0 && b > a) return text.slice(0, a) + block + text.slice(b + END.length);
  return block + '\n\n' + text;
}

export function drifted() {
  const block = tokenBlock();
  return TARGETS.filter((rel) => {
    const text = norm(readFileSync(join(ROOT, rel), 'utf8'));
    return withTokens(text, block) !== text;
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--check')) {
    const bad = drifted();
    if (bad.length) {
      console.error('Design tokens out of sync in: ' + bad.join(', ') + '\nRun: node scripts/sync-design-tokens.js');
      process.exit(1);
    }
    console.log('Design tokens in sync.');
  } else {
    const block = tokenBlock();
    for (const rel of TARGETS) {
      const p = join(ROOT, rel);
      const before = readFileSync(p, 'utf8');
      const after = withTokens(before, block);
      if (after !== norm(before)) writeFileSync(p, after);
      console.log((after !== norm(before) ? 'updated ' : 'ok      ') + rel);
    }
  }
}
