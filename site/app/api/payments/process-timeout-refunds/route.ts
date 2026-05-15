import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendOpsAlert } from "@/lib/ops/alerts";

type TimeoutOptions = {
  processAll?: boolean;
  limit?: number;
};

const CRON_HEADER = "x-vercel-cron";
const DEFAULT_LIMIT = Number(process.env.TIMEOUT_REFUNDS_LIMIT || 25);

function buildStripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY || "";
  if (!secret) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(secret);
}

function buildSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("Server misconfigured");
  }
  return createClient(url, key);
}

function isAuthorizedCronRequest(req: Request) {
  if (req.headers.get(CRON_HEADER)) return true;
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const token = new URL(req.url).searchParams.get("token");
  if (token === expected) return true;
  const headerToken = (req.headers.get("x-auro-internal") || "").trim();
  return headerToken === expected;
}

async function processTimeoutRefunds(options: TimeoutOptions, triggeredByCron: boolean): Promise<Response> {
  try {
    const { processAll = false, limit = DEFAULT_LIMIT } = options;
    const stripe = buildStripeClient();
    const admin = buildSupabaseAdmin();

    const { data: timeoutRequests, error: queryError } = await admin
      .from("requests")
      .select(
        `
        id,
        user_id,
        amount_cents,
        stripe_payment_intent_id,
        refund_status,
        refund_reason,
        profiles!requests_user_id_fkey (
          id,
          email,
          full_name,
          username
        )
      `
      )
      .eq("status", "timeout")
      .eq("refund_status", "none")
      .not("stripe_payment_intent_id", "is", null)
      .limit(processAll ? 1000 : limit);

    if (queryError) {
      console.error("Failed to fetch timeout requests:", queryError);
      return new Response(JSON.stringify({ error: "Failed to fetch timeout requests" }), { status: 500 });
    }

    if (!timeoutRequests || timeoutRequests.length === 0) {
      const payload = { success: true, message: "No timeout requests found", processed: 0 };
      if (triggeredByCron) {
        await sendOpsAlert("[Cron] Timeout refunds — nothing to process");
      }
      return new Response(JSON.stringify(payload), { status: 200 });
    }

    console.log(`[timeout-refunds] Processing ${timeoutRequests.length} timeout requests`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const request of timeoutRequests) {
      try {
        results.processed++;
        const paymentIntentId = request.stripe_payment_intent_id;
        const amountCents = request.amount_cents || 0;

        if (!paymentIntentId || amountCents <= 0) {
          results.failed++;
          results.errors.push({
            requestId: request.id,
            error: "Invalid payment intent or amount",
            amount: amountCents,
          });
          continue;
        }

        console.log(`[timeout-refunds] Processing refund for request ${request.id}: $${(amountCents / 100).toFixed(2)}`);

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: amountCents,
          reason: "requested_by_customer",
          metadata: {
            request_id: request.id,
            refund_reason: "timeout_automatic",
            timeout_type: request.refund_reason || "unknown",
          },
        });

        console.log(`[timeout-refunds] Refund created: ${refund.id}`);

        const { error: updateError } = await admin
          .from("requests")
          .update({
            refunded_amount_cents: amountCents,
            refund_status: "refunded",
            refunded_at: new Date().toISOString(),
            stripe_refund_id: refund.id,
            payment_status: "refunded",
          })
          .eq("id", request.id);

        if (updateError) {
          console.error(`[timeout-refunds] Failed to update request ${request.id}:`, updateError);
          results.failed++;
          results.errors.push({
            requestId: request.id,
            error: "Database update failed",
            refundId: refund.id,
          });
        } else {
          results.successful++;
          console.log(`[timeout-refunds] Successfully processed refund for request ${request.id}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`[timeout-refunds] Failed to process request ${request.id}:`, error);
        results.failed++;
        results.errors.push({
          requestId: request.id,
          error: error.message || "Unknown error",
          stripeError: error.code,
        });

        await admin
          .from("requests")
          .update({
            refund_status: "failed",
            refund_reason: `timeout_refund_failed: ${error.message || "Unknown error"}`,
            refunded_at: new Date().toISOString(),
          })
          .eq("id", request.id);
      }
    }

    console.log(`[timeout-refunds] Completed processing: ${results.successful} successful, ${results.failed} failed`);

    if (triggeredByCron) {
      const summary = `[Cron] Timeout refunds — processed ${results.processed}, success ${results.successful}, failed ${results.failed}`;
      await sendOpsAlert(summary, results.errors.length ? { errors: results.errors.slice(0, 5) } : undefined);
    } else if (results.failed > 0) {
      await sendOpsAlert("Manual timeout refunds — failures detected", { errors: results.errors.slice(0, 10) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} timeout requests`,
        results,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error processing timeout refunds:", error);
    await sendOpsAlert("Timeout refund job crashed", { error: error?.message || error });
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process timeout refunds",
        errorType: "UNKNOWN_ERROR",
      }),
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  return processTimeoutRefunds(body, false);
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  return processTimeoutRefunds({}, true);
}
