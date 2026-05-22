import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ojxzssooylmydystjvdo.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc';

async function runTests() {
  console.log("Starting smoke tests...");
  let passed = 0;
  let failed = 0;
  const errors = [];

  const client = createClient(SUPABASE_URL, ANON_KEY);

  async function callFunction(name, payload, headers = {}) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch(e) {}
    if (res.status !== 200) console.log(`[DEBUG] ${name} returned ${res.status}:`, text);
    return { status: res.status, data };
  }
  
  async function callGetFunction(name, headers = {}) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'GET',
      headers
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch(e) {}
    if (res.status !== 200) console.log(`[DEBUG] ${name} returned ${res.status}:`, text);
    return { status: res.status, data };
  }

  function assert(condition, message) {
    if (!condition) {
      failed++;
      errors.push(message);
      console.error(`❌ FAIL: ${message}`);
      return false;
    }
    passed++;
    console.log(`✅ PASS: ${message}`);
    return true;
  }

  try {
    // 1. extension-pairing-start
    const installId = "test-install-id-" + Date.now();
    const { status: p1Status, data: p1Data } = await callFunction('extension-pairing-start', { installId });
    assert(p1Status === 200, "Test 1: extension-pairing-start returns 200");
    assert(p1Data.success === true, "Test 1: extension-pairing-start success");
    assert(!!p1Data.pairingCode && !!p1Data.connectToken && !!p1Data.clientSecret, "Test 1: Returns code, token, secret");
    
    const { pairingCode, connectToken, clientSecret } = p1Data;

    // 2. extension-pairing-status
    const { status: p2Status, data: p2Data } = await callFunction('extension-pairing-status', { connectToken, clientSecret });
    assert(p2Status === 200, "Test 2: extension-pairing-status returns 200");
    assert(p2Data.status === 'pending', "Test 2: Status is pending");

    // 3. Create dummy user for approval
    const email = `testuser_${Date.now()}@example.com`;
    const password = `Password123!`;
    const { data: authData, error: authError } = await client.auth.signUp({ email, password });
    assert(!authError && authData.session?.access_token, "Test 3 Setup: Created dummy user for approval");
    const userJwt = authData.session?.access_token;

    // 3. extension-pairing-approve
    const { status: p3Status, data: p3Data } = await callFunction('extension-pairing-approve', { pairingCode }, { Authorization: `Bearer ${userJwt}` });
    assert(p3Status === 200, "Test 3: extension-pairing-approve returns 200");
    assert(p3Data.success === true, "Test 3: extension-pairing-approve success");
    assert(!p3Data.connectToken, "Test 3: connectToken NOT returned to web client");

    // 4. extension-token-redeem
    const { status: p4Status, data: p4Data } = await callFunction('extension-token-redeem', { connectToken, clientSecret });
    assert(p4Status === 200, "Test 4: extension-token-redeem returns 200");
    assert(p4Data.accessToken?.startsWith('ssat_'), "Test 4: returns valid ssat_");
    assert(p4Data.refreshToken?.startsWith('ssrt_'), "Test 4: returns valid ssrt_");
    assert(!JSON.stringify(p4Data).includes('eyJ'), "Test 13: Privacy - No raw JWTs in redeem payload");
    
    const { accessToken, refreshToken } = p4Data;

    // 5. extension-bootstrap
    const { status: p5Status, data: p5Data } = await callGetFunction('extension-bootstrap', { Authorization: `Bearer ${accessToken}` });
    assert(p5Status === 200, "Test 5: extension-bootstrap returns 200");
    assert(!!p5Data.user && !!p5Data.workspace, "Test 5: Returns user and workspace");
    assert(!JSON.stringify(p5Data).includes('eyJ'), "Test 13: Privacy - No raw JWTs in bootstrap payload");

    // 6. extension-token-refresh
    const { status: p6Status, data: p6Data } = await callFunction('extension-token-refresh', { refreshToken });
    assert(p6Status === 200, "Test 6: extension-token-refresh returns 200");
    assert(p6Data.accessToken?.startsWith('ssat_'), "Test 6: New ssat_ generated");
    
    const newAccessToken = p6Data.accessToken;

    // 7. Refresh token replay
    const { status: p7Status, data: p7Data } = await callFunction('extension-token-refresh', { refreshToken });
    assert(p7Status === 401 || p7Status === 403, "Test 7: Replay returns 401/403");

    // 8. extension-device-revoke
    const { status: p8Status } = await callFunction('extension-device-revoke', {}, { Authorization: `Bearer ${newAccessToken}` });
    assert(p8Status === 200, "Test 8: revoke returns 200");
    const { status: p8bStatus } = await callGetFunction('extension-bootstrap', { Authorization: `Bearer ${newAccessToken}` });
    assert(p8bStatus === 401 || p8bStatus === 403, "Test 8: bootstrap fails after revoke");

    // 9. auth-status with legacy saasToken (JWT)
    const { status: p9Status, data: p9Data } = await callGetFunction('auth-status', { Authorization: `Bearer ${userJwt}` });
    assert(p9Status === 200, "Test 9: Legacy auth-status works with JWT");

    // 10. auth-status with valid ssat_ (we need a new one since we revoked the old one)
    const { data: p10Redeem } = await callFunction('extension-pairing-start', { installId: "new_install" });
    await callFunction('extension-pairing-approve', { pairingCode: p10Redeem.pairingCode }, { Authorization: `Bearer ${userJwt}` });
    const { data: p10Tokens } = await callFunction('extension-token-redeem', { connectToken: p10Redeem.connectToken, clientSecret: p10Redeem.clientSecret });
    const validSsat = p10Tokens.accessToken;

    const { status: p10Status, data: p10Data } = await callGetFunction('auth-status', { Authorization: `Bearer ${validSsat}` });
    assert(p10Status === 200, "Test 10: New auth-status works with ssat_");
    assert(!JSON.stringify(p10Data).includes('eyJ'), "Test 13: Privacy - No raw JWT in auth-status response");

    // 11. existing extension function with legacy token
    const { status: p11Status } = await callGetFunction('get-listings', { Authorization: `Bearer ${userJwt}` });
    assert(p11Status === 200, "Test 11: get-listings works with legacy JWT");

    // 12. invalid ssat_ test
    const invalidSsat = validSsat.slice(0, -5) + "xxxxx";
    const { status: p12Status } = await callGetFunction('auth-status', { Authorization: `Bearer ${invalidSsat}` });
    assert(p12Status === 401 || p12Status === 403, "Test 12: Invalid ssat_ fails safely and doesn't fallback to JWT");

  } catch (e) {
    console.error("Test execution failed exception:", e);
    failed++;
    errors.push(e.toString());
  }

  console.log(`\n\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.log("Errors:");
    errors.forEach(e => console.log(e));
  }
}

runTests();
