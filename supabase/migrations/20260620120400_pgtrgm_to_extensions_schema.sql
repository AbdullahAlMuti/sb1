-- SS-INFO: move pg_trgm out of the public schema into the extensions schema.
-- Supabase adds `extensions` to the default search_path, so all trgm operators
-- and functions remain accessible without schema-qualifying them.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_extension e
    JOIN   pg_namespace n ON n.oid = e.extnamespace
    WHERE  e.extname = 'pg_trgm'
      AND  n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END $$;
