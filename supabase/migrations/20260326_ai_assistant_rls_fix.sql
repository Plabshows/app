-- Allow the AI Assistant (System User) to insert messages
-- This UUID matches the one used in the chat-assistant API
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "AI Assistant can insert bot responses" ON public.messages;
    CREATE POLICY "AI Assistant can insert bot responses" ON public.messages
        FOR INSERT 
        WITH CHECK (sender_id = '00000000-0000-0000-0000-000000000000');
END $$;
