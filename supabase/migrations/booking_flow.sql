-- Booking Flow Migration
-- Tables: booking_requests, quotes, payments, booking_messages

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'quoted', 'accepted', 'declined', 'expired', 'paid', 'canceled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Booking Requests Table
CREATE TABLE IF NOT EXISTS public.booking_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    act_id UUID REFERENCES public.acts(id) ON DELETE SET NULL,
    package_id JSONB, -- Storing the package details snapshot
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Guest Info (if client_id is null)
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    
    -- Event Details
    event_dates DATE[] NOT NULL,
    location_text TEXT,
    place_id TEXT,
    address_details JSONB,
    lat NUMERIC,
    lng NUMERIC,
    expand_search BOOLEAN DEFAULT FALSE,
    start_time TEXT,
    apply_to_all_dates BOOLEAN DEFAULT TRUE,
    duration_minutes INTEGER,
    event_type TEXT,
    guests_count INTEGER,
    budget_amount NUMERIC,
    budget_currency TEXT DEFAULT 'AED',
    notes TEXT,
    
    status booking_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Quotes Table
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_request_id UUID REFERENCES public.booking_requests(id) ON DELETE CASCADE NOT NULL,
    currency TEXT DEFAULT 'AED',
    base_amount NUMERIC NOT NULL,
    extras_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    message_to_client TEXT,
    status quote_status DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_request_id UUID REFERENCES public.booking_requests(id) ON DELETE CASCADE NOT NULL,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    provider TEXT DEFAULT 'stripe',
    stripe_payment_intent_id TEXT,
    stripe_setup_intent_id TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'AED',
    status TEXT NOT NULL, -- requires_payment_method, requires_capture, succeeded, canceled, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS public.booking_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_request_id UUID REFERENCES public.booking_requests(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_role TEXT CHECK (sender_role IN ('client', 'artist', 'admin')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. RLS Policies
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Booking Requests Policies
CREATE POLICY "Users can view their own booking requests" ON public.booking_requests
    FOR SELECT TO authenticated
    USING (auth.uid() = client_id OR auth.uid() = artist_id);

CREATE POLICY "Clients can create booking requests" ON public.booking_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = client_id);

-- Quotes Policies
CREATE POLICY "Users can view related quotes" ON public.quotes
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking_requests 
        WHERE id = booking_request_id AND (client_id = auth.uid() OR artist_id = auth.uid())
    ));

-- Payments Policies
CREATE POLICY "Users can view related payments" ON public.payments
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking_requests 
        WHERE id = booking_request_id AND (client_id = auth.uid() OR artist_id = auth.uid())
    ));

-- Messages Policies
CREATE POLICY "Users can view related messages" ON public.booking_messages
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.booking_requests 
        WHERE id = booking_request_id AND (client_id = auth.uid() OR artist_id = auth.uid())
    ));

CREATE POLICY "Users can send messages to related bookings" ON public.booking_messages
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.booking_requests 
        WHERE id = booking_request_id AND (client_id = auth.uid() OR artist_id = auth.uid())
    ));
