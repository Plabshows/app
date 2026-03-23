-- supabase/fix_storage_rls.sql

-- Drop the incomplete policy from before
DROP POLICY IF EXISTS "Admins have full access to media" ON storage.objects;

-- Recreate with BOTH USING and WITH CHECK, which is required for INSERT operations
CREATE POLICY "Admins have full access to media"
ON storage.objects FOR ALL
USING ( public.is_app_admin() )
WITH CHECK ( public.is_app_admin() );
