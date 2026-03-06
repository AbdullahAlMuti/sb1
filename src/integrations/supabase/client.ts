import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Read from Vite env vars (.env / .env.local) with hardcoded fallback for production
// Added localStorage overrides for local testing
const SUPABASE_URL =
  localStorage.getItem('SB_URL_OVERRIDE') ||
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ojxzssooylmydystjvdo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  localStorage.getItem('SB_KEY_OVERRIDE') ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }

});

// Log which environment is being used (dev only)
if (import.meta.env.DEV) {
  console.log(`[Supabase] Connected to: ${SUPABASE_URL}`);
}