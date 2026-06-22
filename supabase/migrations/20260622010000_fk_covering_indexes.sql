-- Add covering indexes for the 12 foreign keys flagged by the Supabase performance
-- advisor (unindexed_foreign_keys). Unindexed FKs cause sequential scans on the child
-- table during joins and on parent-row deletes/updates. All are single-column FKs on
-- small admin/billing tables, so plain CREATE INDEX (brief lock) is fine at this scale.
-- Idempotent via IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id          ON public.admin_audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id    ON public.admin_audit_logs (target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_support_notes_admin_id       ON public.admin_support_notes (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_support_notes_user_id        ON public.admin_support_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_selected_plan_id ON public.checkout_sessions (selected_plan_id);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_author_id          ON public.marketing_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_profiles_pending_plan_id           ON public.profiles (pending_plan_id);
CREATE INDEX IF NOT EXISTS idx_profiles_selected_plan_id          ON public.profiles (selected_plan_id);
CREATE INDEX IF NOT EXISTS idx_shopify_page_settings_updated_by   ON public.shopify_page_settings (updated_by);
CREATE INDEX IF NOT EXISTS idx_store_designs_created_by           ON public.store_designs (created_by);
CREATE INDEX IF NOT EXISTS idx_store_designs_updated_by           ON public.store_designs (updated_by);
CREATE INDEX IF NOT EXISTS idx_user_feature_overrides_admin_id    ON public.user_feature_overrides (admin_id);
