-- Alter Bookings table to manage Escrow & Separate Transfers (120% rule) without dropping the reference to reviews
ALTER TABLE public.bookings DROP COLUMN IF EXISTS total_amount CASCADE;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS platform_fee CASCADE;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS artist_payout CASCADE;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS artist_net_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS performrs_fee numeric NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_total_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_transfer_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS fund_status text DEFAULT 'pending_payment';

-- The RLS policies from previous migrations will persist, 
-- Client and Artist visibility remains fully locked down.
