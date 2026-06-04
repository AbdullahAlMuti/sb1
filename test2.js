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
const connectToken = getRequiredEnv('CONNECT_TOKEN');
const clientSecret = getRequiredEnv('CLIENT_SECRET');

async function runTest2() {
  console.log('\n[Test 7] Polling status (approved)');
  const res5 = await fetch(`${SUPABASE_URL}/functions/v1/extension-pairing-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ connectToken, clientSecret }),
  });
  const poll2 = await res5.json();
  console.log('Poll 2:', poll2);

  if (poll2.status === 'approved') {
    console.log('\n[Test 8] Redeeming token');
    const res6 = await fetch(`${SUPABASE_URL}/functions/v1/extension-token-redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ connectToken, clientSecret }),
    });
    const redeemResult = await res6.json();
    console.log('Redeem Result:', JSON.stringify(redeemResult, null, 2));
  }
}

runTest2().catch((error) => {
  console.error(error);
  process.exit(1);
});
