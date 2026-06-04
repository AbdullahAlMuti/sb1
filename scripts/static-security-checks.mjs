import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const checks = [];

function check(name, predicate) {
  checks.push({ name, predicate });
}

function expectIncludes(file, text) {
  return read(file).includes(text);
}

function expectNotIncludes(file, text) {
  return !read(file).includes(text);
}

check('checkout derives Stripe line item price from plan, not request priceId', () => {
  const source = read('supabase/functions/create-checkout/index.ts');
  return (
    source.includes('stripe_price_id_monthly') &&
    source.includes('stripe_price_id_yearly') &&
    source.includes('Submitted priceId does not match the selected plan') &&
    !source.includes('price: priceId')
  );
});

check('checkout rejects unallowlisted origins', () =>
  expectIncludes('supabase/functions/create-checkout/index.ts', 'requireAllowedOrigin(req)') &&
  !expectIncludes('supabase/functions/create-checkout/index.ts', 'req.headers.get("origin")}/checkout/success')
);

check('extension pairing verifies requested workspace membership', () =>
  expectIncludes('supabase/functions/extension-pairing-approve/index.ts', 'verifyWorkspaceMembership') &&
  expectNotIncludes('supabase/functions/extension-pairing-approve/index.ts', 'In a real app')
);

check('atomic listing and auto-order RPCs exist', () => {
  const migration = read('supabase/migrations/20260604094811_audit_remediation_p1.sql');
  return (
    migration.includes('create_listing_with_usage') &&
    migration.includes('create_auto_order_with_usage') &&
    migration.includes('pg_advisory_xact_lock') &&
    migration.includes('FOR UPDATE')
  );
});

check('RLS update policies include WITH CHECK predicates', () => {
  const migration = read('supabase/migrations/20260604094811_audit_remediation_p1.sql');
  return [
    'Users can update own alerts',
    'Users can update own listings',
    'Users can update own orders',
    'Users can update own profile',
    'Users can update own settings',
  ].every((policy) => migration.includes(policy)) && (migration.match(/WITH CHECK/g)?.length ?? 0) >= 5;
});

check('privileged function execute grants are explicitly revoked', () => {
  const migration = read('supabase/migrations/20260604094811_audit_remediation_p1.sql');
  return migration.includes('REVOKE EXECUTE') && migration.includes('ALTER DEFAULT PRIVILEGES');
});

check('send-inventory-notification is internal-secret protected', () =>
  expectIncludes('supabase/functions/send-inventory-notification/index.ts', 'X-Internal-Function-Secret') &&
  expectIncludes('supabase/functions/amazon-inventory-sync/index.ts', 'X-Internal-Function-Secret') &&
  expectNotIncludes('supabase/functions/amazon-inventory-sync/index.ts', 'SUPABASE_ANON_KEY')
);

check('high-risk functions do not use wildcard CORS headers', () => {
  const files = [
    'supabase/functions/create-checkout/index.ts',
    'supabase/functions/customer-portal/index.ts',
    'supabase/functions/validate-coupon/index.ts',
    'supabase/functions/test-api-key/index.ts',
    'supabase/functions/send-inventory-notification/index.ts',
  ];
  return files.every((file) => !read(file).includes('"Access-Control-Allow-Origin": "*"'));
});

check('audited PII payload logs were removed', () => {
  const files = [
    'supabase/functions/create-auto-order/index.ts',
    'supabase/functions/send-inventory-notification/index.ts',
    'supabase/functions/auth-otp/index.ts',
    'supabase/functions/customer-portal/index.ts',
    'supabase/functions/create-checkout/index.ts',
  ];
  const forbidden = [
    'Received payload',
    'Insert payload',
    'Processing notification request:\', data',
    'Email sent:\', emailResponse',
    'User authenticated", { userId, email',
    'Email: ${email}',
  ];
  return files.every((file) => forbidden.every((text) => !read(file).includes(text)));
});

check('Supabase config documents JWT verification exceptions', () => {
  const config = read('supabase/config.toml');
  return (
    config.includes('[functions.create-checkout]\nverify_jwt = true') &&
    config.includes('[functions.stripe-webhook]\nverify_jwt = false # Stripe signs requests') &&
    config.includes('[functions.auth-otp]\nverify_jwt = false # Public OTP') &&
    config.includes('[functions.send-inventory-notification]\nverify_jwt = false # Internal')
  );
});

let failures = 0;
for (const { name, predicate } of checks) {
  const passed = predicate();
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  process.exitCode = 1;
}
