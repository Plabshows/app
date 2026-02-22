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
        // Authenticate user
        const authHeader = req.headers.get('Authorization')!;
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Get user
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) throw new Error('Unauthorized');

        // Check if user already has a stripe_account_id
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        let accountId = profile?.stripe_account_id;

        if (!accountId) {
            // Create Stripe Express Account
            const account = await stripe.accounts.create({
                type: 'express',
                email: user.email,
                capabilities: {
                    transfers: { requested: true },
                },
                business_type: 'individual',
            });
            accountId = account.id;

            // Save Stripe Account ID to Profile
            await supabaseClient
                .from('profiles')
                .update({ stripe_account_id: accountId })
                .eq('id', user.id);
        }

        // Creates the onboarding link
        const origin = req.headers.get('origin') || 'http://localhost:8081';

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${origin}/artist-dashboard/billing?refresh=true`,
            return_url: `${origin}/artist-dashboard/billing?success=true`,
            type: 'account_onboarding',
        });

        return new Response(
            JSON.stringify({ url: accountLink.url }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        );
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
