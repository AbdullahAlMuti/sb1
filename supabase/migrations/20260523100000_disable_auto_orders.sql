-- Disable Auto Orders from eBay in admin_settings

INSERT INTO public.admin_settings (key, value, updated_at)
VALUES (
    'ebay_sync_enabled', 
    'false', 
    NOW()
)
ON CONFLICT (key) DO UPDATE 
SET value = 'false', updated_at = NOW();

INSERT INTO public.admin_settings (key, value, updated_at)
VALUES (
    'ebay_sync_settings', 
    '{"enabled": false, "daysToSync": 90}'::jsonb, 
    NOW()
)
ON CONFLICT (key) DO UPDATE 
SET value = '{"enabled": false, "daysToSync": 90}'::jsonb, updated_at = NOW();
