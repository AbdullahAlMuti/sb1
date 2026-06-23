-- Remove dead admin_settings keys for the Chrome extension.
--
-- These keys were written by removed admin UI (AdminExtension "Description" and
-- "Settings" tabs, AdminAISettings) but read by NO edge function:
--   * ext_description_prompt  — descriptions read description_config.prompt_skeleton
--   * ext_max_titles_count    — superseded by ext_title_count (the key generate-titles reads)
--   * ext_enable_auto_scrape  — no reader anywhere
--   * ext_scrape_delay_ms     — no reader anywhere
--
-- LIVE keys retained: ext_ai_provider, ext_ai_api_key, ext_ai_model,
-- ext_title_prompt, ext_title_count.
--
-- NOTE: prod apply is HELD pending operator sign-off, per project convention.

DELETE FROM public.admin_settings
WHERE key IN (
  'ext_description_prompt',
  'ext_max_titles_count',
  'ext_enable_auto_scrape',
  'ext_scrape_delay_ms'
);
