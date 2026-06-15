-- Hardening: drop the broad public SELECT policy on the blog-images bucket.
-- The bucket is public, so object URLs (/storage/v1/object/public/blog-images/...) still
-- resolve without it; removing the policy just prevents anonymous clients from LISTING
-- (enumerating) every file. Admins keep full access via the "Admins write blog images"
-- FOR ALL policy. Addresses advisor lint 0025_public_bucket_allows_listing.
DROP POLICY IF EXISTS "Public read blog images" ON storage.objects;
