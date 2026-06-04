import fs from 'node:fs';
import path from 'node:path';

import { appearsToTargetProduction } from './production-target-guard.mjs';

const root = process.cwd();
const envPath = path.join(root, '.env.local');

const failures = [];
const warnings = [];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    failures.push(`Missing ${name} in .env.local`);
  }
  return value ?? '';
}

if (!fs.existsSync(envPath)) {
  failures.push('Missing .env.local. Copy .env.local.example to .env.local before local testing.');
}

const viteSupabaseUrl = requireEnv('VITE_SUPABASE_URL');
requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
const supabaseUrl = requireEnv('SUPABASE_URL');
const appUrl = requireEnv('APP_URL');
const publicAppUrl = requireEnv('PUBLIC_APP_URL');
const marketingAppUrl = requireEnv('MARKETING_APP_URL');
const adminAppUrl = requireEnv('ADMIN_APP_URL');
const environment = requireEnv('ENVIRONMENT');

if (appearsToTargetProduction(viteSupabaseUrl) || appearsToTargetProduction(supabaseUrl)) {
  failures.push('Local env points at the production Supabase project. Use local/test Supabase instead.');
}

if (environment.toLowerCase() === 'production') {
  failures.push('ENVIRONMENT=production is not allowed for local testing.');
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? '';
if (stripeSecretKey.startsWith('sk_live_')) {
  failures.push('Local env contains a live Stripe secret key. Use Stripe test keys only.');
}

if (viteSupabaseUrl && supabaseUrl && viteSupabaseUrl !== supabaseUrl) {
  warnings.push('VITE_SUPABASE_URL and SUPABASE_URL differ. Confirm frontend and backend are targeting the same non-production project.');
}

const localUrls = [
  ['APP_URL', appUrl],
  ['PUBLIC_APP_URL', publicAppUrl],
  ['MARKETING_APP_URL', marketingAppUrl],
  ['ADMIN_APP_URL', adminAppUrl],
];

for (const [name, value] of localUrls) {
  if (value && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(value)) {
    warnings.push(`${name} is not a localhost URL. That is okay for a staging environment, but confirm it is non-production.`);
  }
}

if (warnings.length > 0) {
  console.warn('Local env warnings:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
  console.warn('');
}

if (failures.length > 0) {
  console.error('Local env check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Local env check passed.');
