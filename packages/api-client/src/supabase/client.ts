import { createClient } from '@supabase/supabase-js';
import type { Database } from '@repo/types/supabase';

const cleanEnvVar = (val: string | null | undefined): string => {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').trim();
};

// Read from Vite env vars (.env / .env.local)
// Fallback to localStorage ONLY in development mode for local testing
const SUPABASE_URL = cleanEnvVar(
  (import.meta.env.DEV ? localStorage.getItem('SB_URL_OVERRIDE') : null) ||
  import.meta.env.VITE_SUPABASE_URL
);

const SUPABASE_PUBLISHABLE_KEY = cleanEnvVar(
  (import.meta.env.DEV ? localStorage.getItem('SB_KEY_OVERRIDE') : null) ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Import the supabase client like this:
// import { supabase } from "@repo/api-client/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    lock: async (name, acquireTimeout, fn) => {
      return await fn();
    },
  }
});

// Log which environment is being used (dev only)
if (import.meta.env.DEV) {
  const urlOverride = localStorage.getItem('SB_URL_OVERRIDE');
  const keyOverride = localStorage.getItem('SB_KEY_OVERRIDE');
  if (urlOverride || keyOverride) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Supabase] ⚠️ WARNING: Using localStorage overrides!\n` +
      `  - SB_URL_OVERRIDE: ${urlOverride || 'not set'}\n` +
      `  - SB_KEY_OVERRIDE: ${keyOverride ? '[REDACTED]' : 'not set'}\n` +
      `If you are unable to connect to Edge Functions, clear these overrides by running in your browser console:\n` +
      `  localStorage.removeItem('SB_URL_OVERRIDE'); localStorage.removeItem('SB_KEY_OVERRIDE'); window.location.reload();`
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(`[Supabase] Connected to: ${SUPABASE_URL}`);
  }
}

/**
 * Extract a clean error message from a Supabase function error response.
 */
export async function getFunctionErrorMessage(error: any): Promise<string | null> {
  if (!error) return null;
  if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
    try {
      const errJson = await error.context.clone().json();
      if (errJson && errJson.error) {
        return errJson.error;
      }
    } catch (_) {
      try {
        const errText = await error.context.clone().text();
        if (errText) return errText;
      } catch (_) {}
    }
  }
  return error.message || null;
}
