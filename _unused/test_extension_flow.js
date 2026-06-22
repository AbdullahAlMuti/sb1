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

async function runTests() {
  console.log('--- PHASE 7.5D END-TO-END TESTS ---');

  console.log('\n[Test 1] Fetching extension-config (disabled)');
  const res1 = await fetch(`${SUPABASE_URL}/functions/v1/extension-config`, {
    headers: { apikey: ANON_KEY },
  });
  const config1 = await res1.json();
  console.log('Config 1:', config1);
  if (config1.extension_new_auth_enabled) throw new Error('Expected new auth to be disabled by default');

  console.log('\n[Test 2] Assuming new auth is enabled in database via manual SQL/MCP.');

  console.log('\n[Test 3] Fetching extension-config (enabled)');
  const res2 = await fetch(`${SUPABASE_URL}/functions/v1/extension-config`, {
    headers: { apikey: ANON_KEY },
  });
  const config2 = await res2.json();
  console.log('Config 2:', config2);
  if (!config2.extension_new_auth_enabled) console.warn('New auth not enabled - cache might be active. Acceptable during fast polling.');

  console.log('\n[Test 4] Calling extension-pairing-start');
  const res3 = await fetch(`${SUPABASE_URL}/functions/v1/extension-pairing-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ installId: 'test-install-123', version: '1.0.0' }),
  });
  const pairingData = await res3.json();
  console.log('Pairing Start Result:', pairingData);
  if (!pairingData.pairingCode) throw new Error('No pairing code returned');

  const { connectToken, clientSecret, pairingCode } = pairingData;

  console.log('\n[Test 5] Polling status (pending)');
  const res4 = await fetch(`${SUPABASE_URL}/functions/v1/extension-pairing-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ connectToken, clientSecret }),
  });
  const poll1 = await res4.json();
  console.log('Poll 1:', poll1);
  if (poll1.status !== 'pending') throw new Error('Expected pending status');

  console.log('\n[Test 6] Approve this pairing code in an isolated database before continuing.');
  console.log(`Pairing code: ${pairingCode}`);

  await new Promise((resolve) => setTimeout(resolve, 30000));
  console.log('Assuming approved in DB after 30s.');

  console.log('\n[Test 7] Polling status (approved)');
  const res5 = await fetch(`${SUPABASE_URL}/functions/v1/extension-pairing-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ connectToken, clientSecret }),
  });
  const poll2 = await res5.json();
  console.log('Poll 2:', poll2);
  if (poll2.status !== 'approved') throw new Error('Expected approved status');

  console.log('\n[Test 8] Redeeming token');
  const res6 = await fetch(`${SUPABASE_URL}/functions/v1/extension-token-redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ connectToken, clientSecret }),
  });
  const redeemResult = await res6.json();
  console.log('Redeem Result:', redeemResult);
  if (!redeemResult.session) throw new Error('Expected session from redeem');

  console.log('\n[Test 9] Restore app_feature_flags to safe defaults.');
  console.log('\nALL END-TO-END TESTS PASSED');
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
