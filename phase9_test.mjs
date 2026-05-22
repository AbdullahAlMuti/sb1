const SUPABASE_URL = "https://ojxzssooylmydystjvdo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc";

async function runTests() {
  console.log('--- PHASE 9 AUTOMATED TESTS ---');
  let failures = 0;
  
  const assert = (condition, msg) => {
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      failures++;
    } else {
      console.log(`✅ PASSED: ${msg}`);
    }
  };

  const invoke = async (functionName, body = {}, authHeader = null) => {
    const headers = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY };
    if (authHeader) headers['Authorization'] = authHeader;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: Object.keys(body).length > 0 ? 'POST' : 'GET',
      headers,
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
    return res.json();
  };

  try {
    const configRes = await invoke('extension-config');
    assert(configRes && typeof configRes.extension_new_auth_enabled === 'boolean', 'extension-config returns safe flags');
    assert(configRes.extension_new_auth_enabled === false, 'new auth is explicitly false by default');
    assert(configRes.extension_legacy_fallback_enabled === true, 'legacy saasToken still works by default');
    
    console.log('\n--- Testing Extension Pairing Flow ---');
    const pairingStartRes = await invoke('extension-pairing-start', { installId: 'test-123', version: '1.0.0' });
    assert(pairingStartRes.success && pairingStartRes.pairingCode, 'extension-pairing-start works');
    
    const { connectToken, clientSecret } = pairingStartRes;
    const pairingStatusRes = await invoke('extension-pairing-status', { connectToken, clientSecret });
    assert(pairingStatusRes.status === 'pending', 'extension-pairing-status works (pending)');
    
    const badBootstrapRes = await invoke('extension-bootstrap', { installId: 'test-123', version: '1.0.0' }, `Bearer bad_token_xyz`);
    assert(!badBootstrapRes.success && badBootstrapRes.error, 'invalid ssat fails securely');

  } catch (err) {
    console.error('Fatal Error:', err);
    failures++;
  }
  
  console.log(`\nTests completed with ${failures} failures.`);
  if (failures > 0) process.exit(1);
}

runTests();
