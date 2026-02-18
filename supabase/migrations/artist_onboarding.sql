-- Migration for Artist Onboarding Flow

-- 1. Updates to PROFILES table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- 2. Updates to ACTS table
-- Ensure we have the standardized columns requested
ALTER TABLE acts 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS technical_specs TEXT,
ADD COLUMN IF NOT EXISTS photos_url TEXT[],
ADD COLUMN IF NOT EXISTS video_url TEXT; -- Already exists, but ensuring

-- Migrate existing data to new columns if needed (assuming 1:1 mapping for simplicity)
UPDATE acts SET name = title WHERE name IS NULL;
UPDATE acts SET technical_specs = specs WHERE technical_specs IS NULL;

-- 3. Security Policies (RLS) for ACTS

-- Enable RLS (should be already enabled, but good practice)
ALTER TABLE acts ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to create an Act (they become the owner)
CREATE POLICY "Authenticated users can create acts"
ON acts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Allow users to update ONLY their own acts
CREATE POLICY "Users can update own acts"
ON acts FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Ensure users can see their own acts (even if not public/published)
CREATE POLICY "Users can view own acts"
ON acts FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Public access: Only show acts if the OWNER profile is published
-- Note: This assumes the 'public' requirement means joining with profiles.
-- For simplicity in listing, we might just filter in the frontend/query or use a view.
-- But strict RLS would look like:
-- CREATE POLICY "Public can view acts from published profiles"
-- ON acts FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles 
--     WHERE profiles.id = acts.owner_id 
--     AND profiles.is_published = TRUE
--   )
-- );

-- 4. Storage Bucket for Artist Photos
-- Note: You usually create buckets in the dashboard, but you can try inserting into storage.buckets if you have permissions.
-- We will provide the SQL to Insert if it doesn't exist.

INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-photos', 'artist-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'artist-photos'
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'artist-photos' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'artist-photos' AND auth.uid() = owner );

-- Allow users to update/delete their own files
CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'artist-photos' AND auth.uid() = owner );

CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'artist-photos' AND auth.uid() = owner );
