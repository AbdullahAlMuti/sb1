-- Drop existing SELECT policy for active notices
DROP POLICY IF EXISTS "Active notices are viewable by everyone" ON notices;

-- Create new policy that allows authenticated users to view active notices
CREATE POLICY "Active notices are viewable by authenticated users"
ON notices
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (starts_at IS NULL OR starts_at <= now()) 
  AND (ends_at IS NULL OR ends_at >= now())
);