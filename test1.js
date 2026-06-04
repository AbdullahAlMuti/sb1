import {
  assertNotProductionTarget,
  getRequiredEnv,
} from './scripts/production-target-guard.mjs';

const SUPABASE_URL = getRequiredEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
assertNotProductionTarget(SUPABASE_URL);

const ANON_KEY = getRequiredEnv('SUPABASE_ANON_KEY', [
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
]);

async function runTest1() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/extension-pairing-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ installId: 'test-install-123', version: '1.0.0' }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data));
}

runTest1().catch((error) => {
  console.error(error);
  process.exit(1);
});
