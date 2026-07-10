#!/usr/bin/env node
// sync-pricing-core.js — copies the canonical pricing-core.js to the Supabase
// _shared/ directory and appends ES module exports for Deno edge function use.
//
// Run: node scripts/sync-pricing-core.js
// Called automatically as part of `npm run build`.
//
// The canonical source is suppliers/core/pricing-core.js (extension code).
// The generated output is supabase/functions/_shared/pricing-core.js (Deno).
// NEVER hand-edit the _shared/ copy — it will be overwritten on next build.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT   = path.resolve(__dirname, '..');
const REPO_ROOT  = path.resolve(EXT_ROOT, '..', '..');

const SRC  = path.join(EXT_ROOT, 'suppliers', 'core', 'pricing-core.js');
const DEST = path.join(REPO_ROOT, 'supabase', 'functions', '_shared', 'pricing-core.js');

const DENO_FOOTER = `
// ─── ES module exports for Deno edge functions (appended by sync-pricing-core.js) ───
// In Deno Deploy, window === globalThis, so the IIFE above assigned window.SSPricingCore.
// We re-export the members as named ES exports for clean import syntax.
const { parseToIntCents, centsToDisplay, applyRoundingRule, calculatePrice, calculatePriceV2 } = window.SSPricingCore;
export { parseToIntCents, centsToDisplay, applyRoundingRule, calculatePrice, calculatePriceV2 };
export default window.SSPricingCore;
`;

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

// Deno 2 removed the `window` global (Deno 1 aliased it to globalThis). A
// module-scoped `const window = globalThis` keeps the canonical extension
// source untouched while making the generated copy correct on every Deno
// version and on Supabase Edge Runtime.
const DENO_HEADER = `// Deno 2 has no window global — module-scoped alias keeps the IIFE below portable.
const window = globalThis;
`;

const src = fs.readFileSync(SRC, 'utf8');
const destContent = DENO_HEADER + src + DENO_FOOTER;

// Check if destination is already up-to-date (skip noisy writes in watch mode)
if (fs.existsSync(DEST)) {
  const existing = fs.readFileSync(DEST, 'utf8');
  if (sha256(existing) === sha256(destContent)) {
    console.log('sync-pricing-core: _shared/pricing-core.js is up-to-date, skipping.');
    process.exit(0);
  }
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, destContent, 'utf8');

const srcHash  = sha256(src).slice(0, 8);
const destHash = sha256(destContent).slice(0, 8);
console.log(`sync-pricing-core: wrote _shared/pricing-core.js (src=${srcHash} dest=${destHash})`);
