import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.18.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency, description, destination_account, leadId } = await req.json()

    if (!amount || !currency) {
      throw new Error("Missing amount or currency")
    }

    // Convert AED directly to smallest currency unit (fils / cents)
    const amountInSmallestUnit = amount * 100

    // Construct the payload for Stripe
    const paymentIntentPayload: any = {
      amount: amountInSmallestUnit,
      currency,
      description,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        lead_id: leadId,
      }
    }

    // Logic for Destination Charges (B2B Margin)
    if (destination_account) {
      // Calculate the base cost that goes to the artist (e.g. Total / 1.20)
      // Hardcoded mathematical reverse of our x1.20 markup strategy for this example
      const artistShare = Math.round(amountInSmallestUnit / 1.20)

      paymentIntentPayload.transfer_data = {
        destination: destination_account,
        amount: artistShare
      }
    }

    // Ask Stripe to create the intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentPayload)

    // Return the secret to the Mobile App
    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Stripe API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
