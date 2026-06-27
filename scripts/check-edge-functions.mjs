/**
 * check-edge-functions.mjs
 *
 * Runs `deno check` on every Supabase edge function to catch TypeScript errors
 * before deployment. Skips gracefully when Deno is not installed (warning only)
 * so it never blocks local development on machines without Deno. In CI, the
 * workflow installs Deno so failures are hard errors.
 *
 * Usage:
 *   node scripts/check-edge-functions.mjs           # all functions
 *   node scripts/check-edge-functions.mjs stripe    # functions whose name matches
 *
 *   --strict   exit 1 even when Deno is missing (for CI enforcement)
 *   --no-cache pass --no-check-cached to deno (slower but always fresh)
 */

import { execSync, spawnSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const FUNCTIONS_DIR = join(ROOT, 'supabase', 'functions');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const noCache = args.includes('--no-cache');
const filter = args.find((a) => !a.startsWith('--'));

// ── Locate deno ──────────────────────────────────────────────────────────────

function findDeno() {
  try {
    const result = spawnSync('deno', ['--version'], { encoding: 'utf8', timeout: 5000 });
    if (result.status === 0) return 'deno';
  } catch {}
  // Windows: also try %USERPROFILE%\.deno\bin\deno.exe
  const winPath = process.env.USERPROFILE
    ? join(process.env.USERPROFILE, '.deno', 'bin', 'deno.exe')
    : null;
  if (winPath && existsSync(winPath)) return winPath;
  return null;
}

const DENO = findDeno();

if (!DENO) {
  const msg =
    'deno not found — skipping edge-function type checks.\n' +
    'Install Deno (https://deno.land/#installation) to enable this gate locally.';
  if (strict) {
    console.error(`[check-edge-functions] ERROR: ${msg}`);
    process.exit(1);
  }
  console.warn(`[check-edge-functions] WARN: ${msg}`);
  process.exit(0);
}

// ── Discover functions ────────────────────────────────────────────────────────

const functions = readdirSync(FUNCTIONS_DIR)
  .filter((name) => {
    if (name.startsWith('_')) return false; // skip _shared
    if (filter && !name.includes(filter)) return false;
    const entry = join(FUNCTIONS_DIR, name, 'index.ts');
    return existsSync(entry) && statSync(join(FUNCTIONS_DIR, name)).isDirectory();
  })
  .sort();

if (functions.length === 0) {
  console.log('[check-edge-functions] No functions matched. Nothing to check.');
  process.exit(0);
}

console.log(`[check-edge-functions] Checking ${functions.length} edge function(s) with Deno...\n`);

// ── Run deno check ────────────────────────────────────────────────────────────

const results = { passed: [], failed: [] };

for (const fn of functions) {
  const entrypoint = join(FUNCTIONS_DIR, fn, 'index.ts');
  const denoArgs = ['check'];
  if (noCache) denoArgs.push('--no-check-cached');
  denoArgs.push(entrypoint);

  process.stdout.write(`  ${fn.padEnd(42)} `);

  const result = spawnSync(DENO, denoArgs, {
    encoding: 'utf8',
    timeout: 60_000,
    env: {
      ...process.env,
      // Suppress progress output; errors still appear on stderr.
      NO_COLOR: '1',
    },
  });

  if (result.status === 0) {
    console.log('OK');
    results.passed.push(fn);
  } else {
    console.log('FAIL');
    // Print deno's stderr indented for readability.
    const detail = (result.stderr || result.stdout || '').trim();
    if (detail) {
      console.error(
        detail
          .split('\n')
          .map((l) => `    ${l}`)
          .join('\n'),
      );
    }
    results.failed.push(fn);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('');
console.log(
  `[check-edge-functions] ${results.passed.length} passed, ${results.failed.length} failed` +
    (filter ? ` (filter: "${filter}")` : ''),
);

if (results.failed.length > 0) {
  console.error('[check-edge-functions] Failed functions:');
  for (const fn of results.failed) {
    console.error(`  - ${fn}`);
  }
  process.exit(1);
}
