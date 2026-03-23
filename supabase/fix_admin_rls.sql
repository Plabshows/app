-- supabase/fix_admin_rls.sql

-- 1. Create a secure function to check admin status
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('admin', 'superadmin') OR is_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Profiles Table Policies
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users and Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins have full access to profiles" ON public.profiles;

CREATE POLICY "Users and Admins can update profiles"
ON public.profiles FOR UPDATE
USING (
    auth.uid() = id OR public.is_app_admin()
);

-- 3. Acts Table Policies
DROP POLICY IF EXISTS "Artists can update their own acts." ON public.acts;
DROP POLICY IF EXISTS "Artists and Admins can update acts" ON public.acts;
DROP POLICY IF EXISTS "Superadmins have full access to acts" ON public.acts;

CREATE POLICY "Artists and Admins can update acts"
ON public.acts FOR UPDATE
USING (
    auth.uid() = owner_id OR public.is_app_admin()
);

DROP POLICY IF EXISTS "Artists can insert their own acts." ON public.acts;
DROP POLICY IF EXISTS "Artists and Admins can insert acts" ON public.acts;
CREATE POLICY "Artists and Admins can insert acts"
ON public.acts FOR INSERT
WITH CHECK (
    auth.uid() = owner_id OR public.is_app_admin()
);

-- 4. If you have any storage buckets, allow admins to upload images for acts
DROP POLICY IF EXISTS "Admins have full access to media" ON storage.objects;
CREATE POLICY "Admins have full access to media"
ON storage.objects FOR ALL
USING ( public.is_app_admin() );
