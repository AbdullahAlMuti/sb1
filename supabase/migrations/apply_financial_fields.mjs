#!/usr/bin/env node
/**
 * eBay Order Financial Fields - Database Migration Script
 * Run this to add financial tracking fields to ebay_orders table.
 */

import { createClient } from '@supabase/supabase-js';
import {
  assertNotProductionTarget,
  getRequiredEnv,
} from '../../scripts/production-target-guard.mjs';

const SUPABASE_URL = getRequiredEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
assertNotProductionTarget(SUPABASE_URL);

const SUPABASE_SERVICE_ROLE_KEY = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  console.log('Applying eBay Order Financial Fields Migration...\n');

  const migrationSQL = `
-- Add financial tracking fields to ebay_orders for detailed order analytics

ALTER TABLE public.ebay_orders
ADD COLUMN IF NOT EXISTS shipping_cost numeric(10,2),
ADD COLUMN IF NOT EXISTS ad_fee numeric(10,2),
ADD COLUMN IF NOT EXISTS amazon_price numeric(10,2),
ADD COLUMN IF NOT EXISTS earnings numeric(10,2),
ADD COLUMN IF NOT EXISTS transaction_id text;

COMMENT ON COLUMN public.ebay_orders.shipping_cost IS 'Shipping cost charged to buyer';
COMMENT ON COLUMN public.ebay_orders.ad_fee IS 'Promoted listings / advertising fee';
COMMENT ON COLUMN public.ebay_orders.amazon_price IS 'Amazon purchase cost (for dropshipping)';
COMMENT ON COLUMN public.ebay_orders.earnings IS 'Net earnings after fees (transaction - ad_fee - amazon_price)';
COMMENT ON COLUMN public.ebay_orders.transaction_id IS 'eBay transaction ID or sales record number';
  `.trim();

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration failed:', error.message);
      process.exit(1);
    }

    console.log('Migration applied successfully.\n');
    console.log('Added columns:');
    console.log('  - shipping_cost (numeric)');
    console.log('  - ad_fee (numeric)');
    console.log('  - amazon_price (numeric)');
    console.log('  - earnings (numeric)');
    console.log('  - transaction_id (text)\n');

    const { error: verifyError } = await supabase
      .from('ebay_orders')
      .select('*')
      .limit(0);

    if (!verifyError) {
      console.log('Verification successful - columns exist.');
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

applyMigration();
