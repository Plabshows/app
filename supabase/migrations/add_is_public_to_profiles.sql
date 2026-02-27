-- Profile Visibility Upgrade Script

-- 1. Add the new boolean column to the profiles table
ALTER TABLE profiles ADD COLUMN is_public BOOLEAN DEFAULT false;

-- 2. Update existing published artists/talents to have is_public = true so they don't break in production
UPDATE profiles 
SET is_public = true 
WHERE role IN ('artist', 'talent') AND is_published = true;
