import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { actId, date } = await req.json();

        // Authenticate user
        const authHeader = req.headers.get('Authorization')!;
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) throw new Error('Unauthorized');

        // SECURITY REFACTOR (Server-Side Pricing Validation):
        // Initialize an Admin Service Client to bypass RLS and fetch the pure backend base price
        const serviceClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Fetch Act details & Stripe connected account ID securely from the backend
        const { data: act } = await serviceClient
            .from('acts')
            .select('*, profiles(stripe_account_id, stripe_onboarding_complete)')
            .eq('id', actId)
            .single();

        if (!act) throw new Error('Act not found');

        // Ensure Act's owner has finished Stripe Onboarding
        if (!act.profiles?.stripe_account_id || !act.profiles?.stripe_onboarding_complete) {
            throw new Error('Artist cannot accept payments yet.');
        }

        // Mathematical Escrow Rules
        const artistNetAmount = parseInt(String(act.price_guide).replace(/[^0-9]/g, '')) * 100 || 100000;
        const performrsFee = Math.round(artistNetAmount * 0.20);
        const clientTotalAmount = artistNetAmount + performrsFee; // 120%

        // Insert Bookings Draft (Escrow specific columns)
        const { data: booking } = await supabaseClient
            .from('bookings')
            .insert({
                act_id: actId,
                client_id: user.id,
                event_date: date,
                artist_net_amount: artistNetAmount / 100,
                performrs_fee: performrsFee / 100,
                client_total_amount: clientTotalAmount / 100,
                fund_status: 'pending_payment'
            })
            .select()
            .single();

        const origin = req.headers.get('origin') || 'http://localhost:8081';

        // DESTINATION CHARGES MODEL (Opaque Pricing):
        // Charge 120% to the platform, transfer exactly 100% (net amount) to the artist instantly.
        // Performrs retains the 20% remainder automatically to cover Stripe fees and platform revenue.
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'aed',
                        product_data: {
                            name: `Booking for ${act.name}`,
                        },
                        unit_amount: clientTotalAmount,
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                transfer_data: {
                    destination: act.profiles.stripe_account_id,
                    amount: artistNetAmount
                },
                metadata: {
                    bookingId: booking.id,
                    type: 'destination_charge'
                }
            },
            success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/booking-cancel`,
        });

        // Update draft with Stripe Intention ID
        await serviceClient
            .from('bookings')
            .update({ stripe_payment_intent_id: session.payment_intent })
            .eq('id', booking.id);

        return new Response(
            JSON.stringify({ url: session.url }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
