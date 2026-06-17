import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

describe('Operational Admin Security Hardening', () => {
  let userClient;
  let testUserEmail;
  let testUserId;

  before(async () => {
    if (!SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_ANON_KEY is not defined in environment.');
    }

    testUserEmail = `security-test-${Date.now()}@sellersuit-test.com`;
    const tempPassword = 'SecurityTestPass123!';

    const baseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Sign up a temporary non-admin user
    const { data: signUpData, error: signUpError } = await baseClient.auth.signUp({
      email: testUserEmail,
      password: tempPassword,
    });

    if (signUpError) {
      throw new Error(`Failed to sign up test user: ${signUpError.message}`);
    }

    testUserId = signUpData.user.id;

    // Create a dedicated client authenticated as this non-admin user
    userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: testUserEmail,
      password: tempPassword,
    });

    if (signInError) {
      throw new Error(`Failed to sign in test user: ${signInError.message}`);
    }
  });

  test('non-admin user is blocked from executing admin RPCs', async () => {
    // 1. adjust_user_credits_admin
    const { error: creditsError } = await userClient.rpc('adjust_user_credits_admin', {
      p_user_id: testUserId,
      p_amount: 100,
      p_adjustment_type: 'grant',
      p_reason: 'Testing exploit'
    });
    assert.ok(creditsError, 'credits adjustment should fail for non-admin');
    assert.match(creditsError.message || '', /(Unauthorized|permission denied|42501|not found)/i);

    // 2. toggle_user_status_admin
    const { error: statusError } = await userClient.rpc('toggle_user_status_admin', {
      p_user_id: testUserId,
      p_is_active: false,
      p_reason: 'Testing exploit'
    });
    assert.ok(statusError, 'status toggle should fail for non-admin');
    assert.match(statusError.message || '', /(Unauthorized|permission denied|42501|not found)/i);

    // 3. update_user_plan_admin
    const { error: planError } = await userClient.rpc('update_user_plan_admin', {
      p_user_id: testUserId,
      p_plan_id: '00000000-0000-0000-0000-000000000000',
      p_reason: 'Testing exploit'
    });
    assert.ok(planError, 'plan update should fail for non-admin');
    assert.match(planError.message || '', /(Unauthorized|permission denied|42501|not found)/i);

    // 4. get_ebay_user_dashboard_stats_admin
    const { error: statsError } = await userClient.rpc('get_ebay_user_dashboard_stats_admin', {
      p_user_id: testUserId
    });
    assert.ok(statsError, 'stats query should fail for non-admin');
    assert.match(statsError.message || '', /(Unauthorized|permission denied|42501|not found)/i);
  });

  test('non-admin user is blocked from direct REST updates to profiles billing columns', async () => {
    const { error: updateError } = await userClient
      .from('profiles')
      .update({ credits: 99999 })
      .eq('id', testUserId);

    assert.ok(updateError, 'direct update to billing columns should fail');
    assert.match(updateError.message || '', /(Not allowed to modify billing|permission denied|42501)/i);
  });

  test('audit logs reject edits and deletions', async () => {
    const { data: updateData, error: updateAuditError } = await userClient
      .from('audit_logs')
      .update({ action: 'EXPLOITED' })
      .eq('user_id', testUserId)
      .select();
    
    if (updateAuditError) {
      assert.match(updateAuditError.message || '', /(immutable|permission denied|42501)/i);
    } else {
      assert.equal(updateData?.length || 0, 0, 'No rows should be updated');
    }

    const { data: deleteData, error: deleteAuditError } = await userClient
      .from('audit_logs')
      .delete()
      .eq('user_id', testUserId)
      .select();
    
    if (deleteAuditError) {
      assert.match(deleteAuditError.message || '', /(immutable|permission denied|42501)/i);
    } else {
      assert.equal(deleteData?.length || 0, 0, 'No rows should be deleted');
    }
  });
});
