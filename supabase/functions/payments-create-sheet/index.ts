import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

/**
 * DEPRECATED: legacy mobile PaymentSheet endpoint.
 *
 * This function created a bare Stripe PaymentIntent with no platform fee, no
 * request linkage, and no escrow — bypassing the 20% platform fee entirely.
 * The web checkout flow (`/api/checkout/create-session`) is the only supported
 * payment path. This endpoint is intentionally disabled so it can never take an
 * un-fee'd payment. Do not re-enable without wiring in the platform-fee model.
 */
serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  return json(
    {
      error: "This payment endpoint is deprecated and disabled. Use the web checkout flow.",
      code: "PAYMENTS_CREATE_SHEET_DEPRECATED",
    },
    410
  );
});
