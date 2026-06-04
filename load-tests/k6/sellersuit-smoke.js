import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://example.supabase.co';
const APP_URL = __ENV.APP_URL || 'https://sellersuit.com';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const USER_JWT = __ENV.USER_JWT || '';
const INTERNAL_FUNCTION_SECRET = __ENV.INTERNAL_FUNCTION_SECRET || '';
const PRODUCTION_TARGET_ERROR = 'This script appears to target production. Refusing to run without ALLOW_PRODUCTION=true.';
const PRODUCTION_SUPABASE_HOST = 'ojxzssooylmydystjvdo.supabase.co';

if (__ENV.ALLOW_PRODUCTION !== 'true' && String(BASE_URL).includes(PRODUCTION_SUPABASE_HOST)) {
  throw new Error(PRODUCTION_TARGET_ERROR);
}

export const options = {
  scenarios: {
    auth_status: {
      executor: 'constant-vus',
      vus: Number(__ENV.AUTH_VUS || 25),
      duration: __ENV.AUTH_DURATION || '2m',
      exec: 'authStatus',
    },
    dashboard_reads: {
      executor: 'constant-vus',
      vus: Number(__ENV.DASHBOARD_VUS || 25),
      duration: __ENV.DASHBOARD_DURATION || '2m',
      exec: 'dashboardReads',
    },
    listings: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.LISTING_RATE || 5),
      timeUnit: '1s',
      duration: __ENV.LISTING_DURATION || '2m',
      preAllocatedVUs: 25,
      exec: 'listingReads',
    },
    ai_generation: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.AI_RATE || 2),
      timeUnit: '1s',
      duration: __ENV.AI_DURATION || '1m',
      preAllocatedVUs: 10,
      exec: 'aiGeneration',
    },
    extension_sessions: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.EXTENSION_RATE || 5),
      timeUnit: '1s',
      duration: __ENV.EXTENSION_DURATION || '2m',
      preAllocatedVUs: 25,
      exec: 'extensionStatus',
    },
    billing_webhook_shape: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.WEBHOOK_RATE || 1),
      timeUnit: '1s',
      duration: __ENV.WEBHOOK_DURATION || '30s',
      preAllocatedVUs: 5,
      exec: 'billingWebhookShape',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

function functionHeaders(extra = {}) {
  return {
    headers: {
      Authorization: USER_JWT ? `Bearer ${USER_JWT}` : `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      Origin: APP_URL,
      'Content-Type': 'application/json',
      ...extra,
    },
  };
}

export function authStatus() {
  const res = http.post(`${BASE_URL}/functions/v1/auth-status`, '{}', functionHeaders());
  check(res, { 'auth status non-5xx': (r) => r.status < 500 });
  sleep(1);
}

export function dashboardReads() {
  const res = http.post(`${BASE_URL}/functions/v1/orders-dashboard`, '{}', functionHeaders());
  check(res, { 'dashboard non-5xx': (r) => r.status < 500 });
  sleep(1);
}

export function listingReads() {
  const res = http.post(`${BASE_URL}/functions/v1/get-listings`, '{}', functionHeaders());
  check(res, { 'listing read non-5xx': (r) => r.status < 500 });
  sleep(1);
}

export function aiGeneration() {
  const body = JSON.stringify({ title: 'Load test item', marketplace: 'ebay' });
  const res = http.post(`${BASE_URL}/functions/v1/generate-titles`, body, functionHeaders());
  check(res, { 'ai generation non-5xx': (r) => r.status < 500 });
  sleep(1);
}

export function extensionStatus() {
  const res = http.post(`${BASE_URL}/functions/v1/extension-auth-config`, '{}', functionHeaders());
  check(res, { 'extension config non-5xx': (r) => r.status < 500 });
  sleep(1);
}

export function billingWebhookShape() {
  const body = JSON.stringify({ id: 'evt_load_test', type: 'noop', data: { object: {} } });
  const res = http.post(
    `${BASE_URL}/functions/v1/stripe-webhook`,
    body,
    functionHeaders({ 'X-Internal-Function-Secret': INTERNAL_FUNCTION_SECRET }),
  );
  check(res, { 'webhook rejects unsigned or non-5xx': (r) => r.status === 400 || r.status < 500 });
  sleep(1);
}
