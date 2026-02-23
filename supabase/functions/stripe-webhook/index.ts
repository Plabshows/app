import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature');
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !endpointSecret) {
        return new Response('Webhook Error: Missing headers or secret', { status: 400 });
    }

    try {
        const body = await req.text();
        let event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
        } catch (err) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        // MANDATORY RULE 1: Webhook system must use Service Role key to bypass RLS and act as admin
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        switch (event.type) {
            case 'account.updated':
                const account = event.data.object;
                if (account.details_submitted) {
                    await supabaseClient
                        .from('profiles')
                        .update({ stripe_onboarding_complete: true })
                        .eq('stripe_account_id', account.id);
                }
                break;

            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                const leadId = paymentIntent.metadata?.lead_id;

                if (leadId) {
                    const { error } = await supabaseClient
                        .from('leads')
                        .update({
                            status: 'paid',
                            payment_status: 'paid',
                            stripe_intent_id: paymentIntent.id
                        })
                        .eq('id', leadId);

                    if (error) {
                        console.error(`Failed to update lead ${leadId}:`, error);
                    } else {
                        console.log(`Successfully updated lead ${leadId} as paid`);
                    }
                } else {
                    console.log(`Payment successful but no lead_id in metadata for Intent: ${paymentIntent.id}`);
                }
                break;

            case 'payment_intent.payment_failed':
                const failedIntent = event.data.object;
                const failedLeadId = failedIntent.metadata?.lead_id;

                if (failedLeadId) {
                    await supabaseClient
                        .from('leads')
                        .update({
                            status: 'payment_failed',
                            payment_status: 'failed',
                            stripe_intent_id: failedIntent.id
                        })
                        .eq('id', failedLeadId);
                }
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err) {
        console.error(`Webhook handler failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
});
