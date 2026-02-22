-- Add Stripe identity fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;

-- Create Bookings table to manage Escrow & Split Payments
CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    act_id uuid REFERENCES public.acts(id) ON DELETE CASCADE,
    client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Client who booked
    event_date date NOT NULL,
    total_amount numeric NOT NULL, -- The 100% price (e.g. 1000)
    platform_fee numeric NOT NULL, -- Performrs cut (e.g. 200)
    artist_payout numeric NOT NULL, -- Artist cut (e.g. 800)
    payment_status text DEFAULT 'pending', -- pending, succeeded, requires_payment_method
    stripe_payment_intent_id text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can view their own bookings, Artists can view bookings assigned to their acts
CREATE POLICY "Users can view their related bookings" ON public.bookings
FOR SELECT TO authenticated
USING (
   client_id = auth.uid() OR 
   act_id IN (SELECT id FROM public.acts WHERE owner_id = auth.uid())
);
