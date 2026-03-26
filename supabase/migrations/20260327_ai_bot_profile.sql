-- Create a system profile for the AI Assistant to satisfy foreign key constraints
INSERT INTO public.profiles (id, name, role, is_verified, avatar_url)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Performance Lab AI',
    'admin',
    true,
    'https://nwxepstpedmxslbznejv.supabase.co/storage/v1/object/public/system/bot-avatar.png'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- Ensure RLS allows the bot to insert messages (already done but reinforcing)
DROP POLICY IF EXISTS "AI Assistant can insert bot responses" ON public.messages;
CREATE POLICY "AI Assistant can insert bot responses" ON public.messages
    FOR INSERT 
    WITH CHECK (sender_id = '00000000-0000-0000-0000-000000000000');
