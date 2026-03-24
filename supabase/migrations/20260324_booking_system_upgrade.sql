-- Formalizing and expanding the messages table for Booking Integration
-- This migration ensures the 'messages' table has the necessary structure for rich cards.

DO $$ 
BEGIN
    -- 1. Ensure columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'booking_id') THEN
        ALTER TABLE public.messages ADD COLUMN booking_id UUID REFERENCES public.booking_requests(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'type') THEN
        ALTER TABLE public.messages ADD COLUMN type TEXT DEFAULT 'text';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'metadata') THEN
        ALTER TABLE public.messages ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- 2. Add constraints if they don't exist
    -- Note: We use a check to allow flexibility while maintaining some structure
    -- type can be: 'text', 'booking_summary', 'booking_status_update', 'payment_confirmation'
END $$;

-- 3. RLS Policies (Safeguard)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see messages they sent or received" ON public.messages;
CREATE POLICY "Users can see messages they sent or received" ON public.messages
    FOR SELECT TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
CREATE POLICY "Users can insert their own messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);
