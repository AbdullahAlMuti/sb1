-- Backfill one default workspace per existing user.
-- Additive and idempotent: no deletes, no destructive updates, no ownership rewrites.

INSERT INTO public.workspaces (owner_user_id, name, slug, status, metadata)
SELECT
  p.id,
  'Default Workspace',
  NULL,
  'active',
  jsonb_build_object('backfilled_from_profile_id', p.id, 'backfill_key', 'default_workspace_v1')
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workspaces w
  WHERE w.owner_user_id = p.id
    AND w.slug IS NULL
)
ON CONFLICT DO NOTHING;

INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
SELECT
  w.id,
  w.owner_user_id,
  'owner',
  'active'
FROM public.workspaces w
WHERE w.slug IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = w.id
      AND wm.user_id = w.owner_user_id
  )
ON CONFLICT (workspace_id, user_id) DO NOTHING;

UPDATE public.profiles p
SET default_workspace_id = w.id
FROM public.workspaces w
WHERE p.default_workspace_id IS NULL
  AND w.owner_user_id = p.id
  AND w.slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_default_workspace_id ON public.profiles (default_workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_status ON public.workspaces (owner_user_id, status);
