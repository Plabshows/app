-- MARKETPLACE & ADMIN INITIALIZATION
-- Goal: Create Leads table and Admin protection.

-- 1. Create Leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_name TEXT NOT NULL,
    client_whatsapp TEXT NOT NULL,
    event_date TEXT NOT NULL,
    act_id UUID REFERENCES acts(id) ON DELETE CASCADE,
    act_owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' -- pending, responded
);

-- 2. Add is_admin to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 3. Enable RLS on leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Leads Policies
DROP POLICY IF EXISTS "Leads can be created by anyone" ON leads;
CREATE POLICY "Leads can be created by anyone" ON leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Artists can view their own leads" ON leads;
CREATE POLICY "Artists can view their own leads" ON leads FOR SELECT USING (
    auth.uid() = act_owner_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 4. Storage for backup (optional)
-- We might need a bucket for admin-uploaded documents later, but not for this phase.

-- 5. Set the current user as Admin (Optional but helpful for the user)
-- Note: Replace with the actual UID or Email if known, but for now we'll let the user manage it.
-- UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
