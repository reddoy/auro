import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.24.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2024-06-20" });

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json",
  } as Record<string, string>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const { amountCents, currency } = await req.json();
    if (!amountCents || !currency) {
      return json({ error: "Missing amountCents or currency" }, 400);
    }

    const customer = await stripe.customers.create();
    const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customer.id }, { apiVersion: "2024-06-20" });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amountCents),
      currency,
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
    });

    return json({
      paymentIntentClientSecret: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customerId: customer.id,
      merchantDisplayName: "Auro",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create payment sheet";
    return json({ error: msg }, 400);
  }
});


