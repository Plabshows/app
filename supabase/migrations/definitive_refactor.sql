-- DEFINITIVE SUPABASE SCHEMA FOR PERFORMANCE LAB / SOUL ARTISTS CLONE
-- Role: Senior Backend Architect
-- Context: Automated Artist Onboarding & Premium Entertainment Marketplace

-- ==========================================
-- 1. EXTENSIONS & CLEANUP
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. CATEGORIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Initial Categories
INSERT INTO categories (name, slug)
VALUES 
    ('Musician', 'musician'),
    ('Dancer', 'dancer'),
    ('Magic', 'magic'),
    ('Roaming', 'roaming'),
    ('Fire & Flow', 'fire-flow'),
    ('Circus', 'circus'),
    ('DJ', 'dj'),
    ('Specialty Act', 'specialty-act')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 3. PROFILES TABLE (Synced with Auth)
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    role TEXT CHECK (role IN ('admin', 'artist')) DEFAULT 'artist',
    is_verified BOOLEAN DEFAULT FALSE,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile." ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- 4. ACTS TABLE (The Catalog)
-- ==========================================
CREATE TABLE IF NOT EXISTS acts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id),
    name TEXT NOT NULL,
    description TEXT,
    technical_specs TEXT,
    price_guide TEXT,
    video_url TEXT,
    image_url TEXT, -- Primary display image
    photos_url TEXT[], -- Gallery
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Legacy fields support (optional/cleanup)
    artist_type TEXT,
    gender TEXT,
    performance_type TEXT,
    genre TEXT,
    location_base TEXT,
    willing_to_travel BOOLEAN DEFAULT FALSE,
    travel_departure_city TEXT,
    min_duration TEXT,
    max_duration TEXT,
    set_count INTEGER,
    setup_time TEXT,
    members_count INTEGER DEFAULT 1
);

-- Enable RLS on acts
ALTER TABLE acts ENABLE ROW LEVEL SECURITY;

-- Acts Policies
CREATE POLICY "Anyone can view published acts." ON acts
    FOR SELECT USING (is_published = true OR auth.uid() = owner_id);

CREATE POLICY "Artists can insert their own acts." ON acts
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Artists can update their own acts." ON acts
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Artists can delete their own acts." ON acts
    FOR DELETE USING (auth.uid() = owner_id);

-- ==========================================
-- 5. STORAGE REGISTRATION (act-photos)
-- ==========================================
-- Note: Bucket creation usually handled via UI or Storage API, 
-- but we can insert into storage.buckets if permissions allow.
INSERT INTO storage.buckets (id, name, public)
VALUES ('act-photos', 'act-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- 1. Allow public to see photos
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'act-photos');

-- 2. Allow artists to upload their own photos
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'act-photos');

-- 3. Allow owners to delete their own photos
CREATE POLICY "Users can delete their own photos" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'act-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ==========================================
-- 6. AUTH TRIGGER (Auto-create profiles)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'artist');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
