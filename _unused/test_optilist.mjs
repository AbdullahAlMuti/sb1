import { createClient } from '@supabase/supabase-js';
import {
  assertNotProductionTarget,
  getRequiredEnv,
} from './scripts/production-target-guard.mjs';

const SUPABASE_URL = getRequiredEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
assertNotProductionTarget(SUPABASE_URL);

const SUPABASE_ANON_KEY = getRequiredEnv('SUPABASE_ANON_KEY', [
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
]);
const TEST_USER_EMAIL = getRequiredEnv('TEST_USER_EMAIL');
const TEST_USER_PASSWORD = getRequiredEnv('TEST_USER_PASSWORD');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testOptilist() {
  console.log('Signing in as', TEST_USER_EMAIL);
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (signInError) throw signInError;
  const token = authData.session.access_token;
  console.log('Logged in successfully. User ID:', authData.user.id);

  const payload = {
    title: 'Test OptiList Amazon Product',
    amazonUrl: 'https://www.amazon.com/dp/B08F7PTF53',
    amazonAsin: 'B08F7PTF53',
    amazonPrice: 29.99,
    ebayPrice: 39.99,
    sku: 'TEST-SKU-1234',
    status: 'active',
    amazon_data: { productTitle: 'Test OptiList Amazon Product' },
  };

  console.log('Calling create-listing edge function...');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-listing`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('Status:', res.status);
  console.log('Response Body:', await res.text());
}

testOptilist().catch((error) => {
  console.error(error);
  process.exit(1);
});
