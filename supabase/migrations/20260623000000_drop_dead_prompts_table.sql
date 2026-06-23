-- Drop the dead `prompts` table.
--
-- Context: the admin "Prompts" CRUD page (AdminPrompts.tsx) was the ONLY reader/
-- writer of this table. No edge function reads `prompts` — AI title generation
-- reads admin_settings.ext_title_prompt / ext_title_count, and description
-- generation reads the `description_config` table. The page has been removed.
--
-- Safety verified before writing this migration (2026-06-23, live prod):
--   * inbound foreign keys referencing prompts: 0
--   * views referencing prompts: 0
--   * RLS policies: 1 ("Users can manage own prompts") — dropped via CASCADE
--   * rows: 2 (stale, no consumers)
--
-- NOTE: prod apply is HELD pending operator sign-off, per project convention.

DROP TABLE IF EXISTS public.prompts CASCADE;
