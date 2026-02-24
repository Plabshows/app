-- ==========================================================
-- 1. ROLES & AUDITING SETUP
-- ==========================================================

-- Ensure admin_audit_logs table exists
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id),
    target_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    data_before JSONB,
    data_after JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs FOR SELECT
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- ==========================================================
-- 2. UPDATING RLS POLICIES FOR GLOBAL ADMIN ACCESS
-- ==========================================================

-- PROFILES
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users and Admins can update profiles"
ON public.profiles FOR UPDATE
USING (
    auth.uid() = id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ACTS
DROP POLICY IF EXISTS "Artists can update their own acts." ON public.acts;
CREATE POLICY "Artists and Admins can update acts"
ON public.acts FOR UPDATE
USING (
    auth.uid() = owner_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- STORAGE (media bucket)
-- Update media bucket policies to allow admins to upload/update/delete any file
CREATE POLICY "Admins have full access to media"
ON storage.objects FOR ALL
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- ==========================================================
-- 3. AUTO-SIGNUP TRIGGER (Public Profile Creation)
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, is_published)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'client', -- Default role
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- ==========================================================
-- 4. MANUALLY SET AN ADMIN (Run this with your ID)
-- ==========================================================
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID_HERE';
