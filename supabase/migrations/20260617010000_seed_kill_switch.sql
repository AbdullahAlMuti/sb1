-- Migration: Seed Global Auto Fulfillment Kill Switch
-- Location: supabase/migrations/20260617010000_seed_kill_switch.sql

INSERT INTO public.admin_settings (key, value, description, updated_at)
VALUES (
    'global_auto_fulfillment_enabled', 
    'true', 
    'Global kill switch for auto-ordering/auto-fulfillment processes',
    NOW()
)
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description, updated_at = NOW();
