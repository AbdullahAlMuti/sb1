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
const ADMIN_EMAIL = getRequiredEnv('ADMIN_EMAIL');
const ADMIN_PASSWORD = getRequiredEnv('ADMIN_PASSWORD');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createAdmin() {
  console.log(`Signing up ${ADMIN_EMAIL}...`);
  const { data, error } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (error) {
    console.error('Signup error:', error);
    process.exit(1);
  }

  console.log('User created. ID:', data.user.id);
}

createAdmin();
