import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.24.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2024-06-20" });
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function getRequestId(metadata: Stripe.Metadata | null | undefined): string | undefined {
  if (!metadata) return undefined;
  return (metadata as any)?.requestId || (metadata as any)?.request_id;
}

async function fetchLatestChargeTotals(paymentIntentId: string) {
  try {
    const expanded = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });
    const latestCharge = expanded.latest_charge as Stripe.Charge | undefined;
    if (!latestCharge) return { fee: null, net: null };
    const balanceTx = latestCharge.balance_transaction as Stripe.BalanceTransaction | undefined;
    if (!balanceTx) return { fee: null, net: null };
    const fee = typeof balanceTx.fee === "number" ? balanceTx.fee : null;
    const net = typeof balanceTx.net === "number" ? balanceTx.net : null;
    return { fee, net };
  } catch (error) {
    console.error("[stripe-webhook] Failed to fetch balance transaction", error);
    return { fee: null, net: null };
  }
}

async function markWebhookEvent(eventId: string, eventType: string) {
  if (!supabaseAdmin) return { alreadyProcessed: false };
  try {
    const { data: existing } = await supabaseAdmin
      .from("webhook_events")
      .select("id,status")
      .eq("stripe_event_id", eventId)
      .maybeSingle();
    if (existing) {
      return { alreadyProcessed: true };
    }
    await supabaseAdmin.from("webhook_events").insert({
      stripe_event_id: eventId,
      event_type: eventType,
      status: "processing",
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      return { alreadyProcessed: true };
    }
    console.error("[stripe-webhook] Unable to insert webhook event", error);
  }
  return { alreadyProcessed: false };
}

async function updateWebhookEventStatus(eventId: string, status: "completed" | "failed", errorMessage?: string) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin
      .from("webhook_events")
      .update({ status, error_message: errorMessage || null })
      .eq("stripe_event_id", eventId);
  } catch (error) {
    console.error("[stripe-webhook] Failed to update webhook event status", error);
  }
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  if (!supabaseAdmin) return;
  const requestId = getRequestId(pi.metadata);
  if (!requestId) return;

  const amountCents =
    typeof pi.amount_received === "number" ? pi.amount_received : typeof pi.amount === "number" ? pi.amount : null;
  const applicationFee =
    typeof pi.application_fee_amount === "number" ? pi.application_fee_amount : undefined;

  const { fee, net } = await fetchLatestChargeTotals(pi.id);

  const updatePayload: Record<string, any> = {
    payment_status: "paid",
    status: "paid",
    stripe_payment_intent_id: pi.id,
    stripe_fee_cents: fee,
    net_amount_cents: net,
  };
  if (amountCents !== null) {
    updatePayload.amount_cents = amountCents;
  }
  if (typeof applicationFee === "number") {
    updatePayload.application_fee_cents = applicationFee;
  } else if ((pi.metadata as any)?.auro_fee_cents) {
    const metadataFee = parseInt((pi.metadata as any).auro_fee_cents, 10);
    if (!Number.isNaN(metadataFee)) {
      updatePayload.application_fee_cents = metadataFee;
    }
  }

  const { error } = await supabaseAdmin.from("requests").update(updatePayload).eq("id", requestId);
  if (error) {
    console.error("[stripe-webhook] Failed to update request for payment intent success", error);
    throw error;
  }
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent, eventType: string) {
  if (!supabaseAdmin) return;
  const requestId = getRequestId(pi.metadata);
  if (!requestId) return;
  const reason = pi.last_payment_error?.message || eventType;
  const { error } = await supabaseAdmin
    .from("requests")
    .update({
      payment_status: "failed",
      payment_distribution_error: reason,
    })
    .eq("id", requestId);
  if (error) {
    console.error("[stripe-webhook] Failed to mark payment as failed", error);
    throw error;
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  if (!supabaseAdmin) return;
  const requestId = getRequestId(charge.metadata);
  if (!requestId) return;
  const amountRefunded = typeof charge.amount_refunded === "number" ? charge.amount_refunded : 0;
  const totalAmount = typeof charge.amount === "number" ? charge.amount : 0;
  const fullyRefunded = totalAmount > 0 && amountRefunded >= totalAmount;

  const updateData: Record<string, any> = {
    refund_status: fullyRefunded ? "refunded" : "partially_refunded",
    refunded_amount_cents: amountRefunded,
    payment_status: fullyRefunded ? "refunded" : "partial_refund",
  };
  if (fullyRefunded) {
    updateData.status = "refunded";
  }

  const { error } = await supabaseAdmin.from("requests").update(updateData).eq("id", requestId);
  if (error) {
    console.error("[stripe-webhook] Failed to update refund status", error);
    throw error;
  }
}

async function handleChargeDispute(dispute: Stripe.Dispute) {
  if (!supabaseAdmin) return;
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as Stripe.Charge | undefined)?.id;
  if (!chargeId) return;
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    const requestId = getRequestId(charge.metadata);
    if (!requestId) return;
    const { error } = await supabaseAdmin
      .from("requests")
      .update({
        payment_status: "disputed",
        payment_distribution_error: "Stripe dispute created",
      })
      .eq("id", requestId);
    if (error) {
      console.error("[stripe-webhook] Failed to flag dispute", error);
      throw error;
    }
  } catch (error) {
    console.error("[stripe-webhook] Unable to retrieve disputed charge", error);
    throw error;
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, event.type);
      break;
    case "charge.refunded":
    case "charge.refund.updated":
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;
    case "charge.dispute.created":
      await handleChargeDispute(event.data.object as Stripe.Dispute);
      break;
    default:
      console.log("[stripe-webhook] Unhandled event type:", event.type);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!supabaseAdmin) {
    console.error("[stripe-webhook] Missing Supabase configuration");
    return json({ error: "Server misconfigured" }, 500);
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature") || "";
    if (!webhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: `Webhook signature verification failed: ${msg}` }, 400);
  }

  const { alreadyProcessed } = await markWebhookEvent(event.id, event.type);
  if (alreadyProcessed) {
    return json({ received: true, alreadyProcessed: true });
  }

  try {
    await handleStripeEvent(event);
    await updateWebhookEventStatus(event.id, "completed");
    return json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateWebhookEventStatus(event.id, "failed", msg);
    return json({ error: msg }, 500);
  }
});


