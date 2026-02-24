-- 1. Create a function to check if a user is a superadmin
-- We can use a role field in the profiles table for this
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role = 'superadmin' OR is_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Profiles RLS Policy
-- Allow superadmins to perform ALL operations on ALL profiles
DROP POLICY IF EXISTS "Superadmins have full access to profiles" ON profiles;
CREATE POLICY "Superadmins have full access to profiles" 
ON profiles FOR ALL 
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- 3. Update Acts RLS Policy
-- Allow superadmins to perform ALL operations on ALL acts
DROP POLICY IF EXISTS "Superadmins have full access to acts" ON acts;
CREATE POLICY "Superadmins have full access to acts" 
ON acts FOR ALL 
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- 4. Storage Policies
-- Allow superadmins full access to 'media' and 'avatars' buckets
-- (Assuming bucket names are 'media' and 'avatars')

DROP POLICY IF EXISTS "Superadmins have full access to media storage" ON storage.objects;
CREATE POLICY "Superadmins have full access to media storage" 
ON storage.objects FOR ALL 
USING (bucket_id IN ('media', 'avatars', 'banners') AND is_superadmin())
WITH CHECK (bucket_id IN ('media', 'avatars', 'banners') AND is_superadmin());

-- 5. Command to set a user as superadmin (Replace 'USER_ID_HERE' with your actual Supabase User ID)
-- UPDATE profiles SET role = 'superadmin', is_admin = true WHERE id = 'USER_ID_HERE';

-- 6. Audit Logs Table (if not already created)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    admin_id UUID REFERENCES auth.users(id),
    target_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Only admins can view audit logs" 
ON public.admin_audit_logs FOR SELECT 
USING (is_superadmin());
