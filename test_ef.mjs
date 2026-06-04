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
const TEST_ADMIN_EMAIL = getRequiredEnv('TEST_ADMIN_EMAIL');
const TEST_ADMIN_PASSWORD = getRequiredEnv('TEST_ADMIN_PASSWORD');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFn() {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
  });

  if (error) throw error;

  const token = authData.session.access_token;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/extension-admin-devices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page: 1, pageSize: 10 }),
  });

  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

testFn().catch((error) => {
  console.error(error);
  process.exit(1);
});
