-- DASHBOARD EMPOWERMENT MIGRATION
-- Goal: Ensure the dashboard can save even if rows don't exist yet, and support all media types.

-- 1. Ensure 'acts' table has a unique constraint on owner_id for easy 'upsert'
-- This allows us to use: supabase.from('acts').upsert({ owner_id: user.id, ... }, { onConflict: 'owner_id' })
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'acts_owner_id_key') THEN
        ALTER TABLE acts ADD CONSTRAINT acts_owner_id_key UNIQUE (owner_id);
    END IF;
END $$;

-- 2. Ensure all required columns exist in 'acts'
ALTER TABLE acts ADD COLUMN IF NOT EXISTS photos_url TEXT[] DEFAULT '{}';
ALTER TABLE acts ADD COLUMN IF NOT EXISTS technical_rider_url TEXT;
ALTER TABLE acts ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE acts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- 3. Create helper tables for multi-item sections if they don't exist
CREATE TABLE IF NOT EXISTS act_awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    act_id UUID REFERENCES acts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    year TEXT,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS act_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    act_id UUID REFERENCES acts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS act_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    act_id UUID REFERENCES acts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price TEXT,
    duration TEXT,
    description TEXT,
    includes TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS and Policies for new tables
ALTER TABLE act_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE act_packages ENABLE ROW LEVEL SECURITY;

-- Awards Policies
DROP POLICY IF EXISTS "Awards viewable by everyone" ON act_awards;
CREATE POLICY "Awards viewable by everyone" ON act_awards FOR SELECT USING (true);
DROP POLICY IF EXISTS "Artists can manage own awards" ON act_awards;
CREATE POLICY "Artists can manage own awards" ON act_awards FOR ALL USING (
    EXISTS (SELECT 1 FROM acts WHERE id = act_awards.act_id AND owner_id = auth.uid())
);

-- Members Policies
DROP POLICY IF EXISTS "Members viewable by everyone" ON act_members;
CREATE POLICY "Members viewable by everyone" ON act_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Artists can manage own members" ON act_members;
CREATE POLICY "Artists can manage own members" ON act_members FOR ALL USING (
    EXISTS (SELECT 1 FROM acts WHERE id = act_members.act_id AND owner_id = auth.uid())
);

-- Packages Policies
DROP POLICY IF EXISTS "Packages viewable by everyone" ON act_packages;
CREATE POLICY "Packages viewable by everyone" ON act_packages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Artists can manage own packages" ON act_packages;
CREATE POLICY "Artists can manage own packages" ON act_packages FOR ALL USING (
    EXISTS (SELECT 1 FROM acts WHERE id = act_packages.act_id AND owner_id = auth.uid())
);

-- 5. Storage Buckets (Ensuring they exist)
INSERT INTO storage.buckets (id, name, public) VALUES ('act-photos', 'act-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('technical-riders', 'technical-riders', true) ON CONFLICT (id) DO NOTHING;
