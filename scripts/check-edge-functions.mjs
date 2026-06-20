// Type-checks all Supabase Edge Functions with `deno check`.
//
// The web `tsc` typecheck does NOT cover Deno edge functions (different runtime,
// remote URL imports), so a broken function can pass CI and only fail at
// `supabase functions deploy`. This guard closes that gap.
//
// Behavior:
//   - deno installed  -> run `deno check` on every functions/<name>/index.ts; exit non-zero on failure.
//   - deno missing + CI -> fail (CI must install deno via denoland/setup-deno so the guard has teeth).
//   - deno missing locally -> warn and skip (don't block devs without deno).

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const fnDir = join(root, 'supabase', 'functions');

function denoAvailable() {
  const r = spawnSync('deno', ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
  return r.status === 0;
}

function entrypoints() {
  if (!existsSync(fnDir)) return [];
  return readdirSync(fnDir)
    .filter((name) => !name.startsWith('_') && statSync(join(fnDir, name)).isDirectory())
    .map((name) => join('supabase', 'functions', name, 'index.ts'))
    .filter((p) => existsSync(join(root, p)));
}

if (!denoAvailable()) {
  const msg = 'deno not found — cannot type-check edge functions.';
  if (process.env.CI) {
    console.error(`FAIL ${msg} Install deno in CI (e.g. denoland/setup-deno).`);
    process.exit(1);
  }
  console.warn(`SKIP ${msg} (install deno to enable this check locally)`);
  process.exit(0);
}

const files = entrypoints();
console.log(`Running deno check on ${files.length} edge functions…`);
const r = spawnSync('deno', ['check', ...files], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
