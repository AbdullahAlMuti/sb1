-- Harden the two remaining public buckets flagged by advisor 0025
-- (public_bucket_allows_listing). Dropping the broad SELECT policy stops anonymous
-- clients from enumerating every file; public object URLs
-- (/storage/v1/object/public/<bucket>/<path>) still resolve because the buckets are
-- public. Verified the app only uses .upload() + .getPublicUrl() on these buckets
-- (no .list()/.download()), so this is non-breaking.
DROP POLICY IF EXISTS "Product images are readable" ON storage.objects;
DROP POLICY IF EXISTS "Store design images are publicly readable" ON storage.objects;
