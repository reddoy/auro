import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendOpsAlert } from "@/lib/ops/alerts";

type RetryOptions = {
  retryAll?: boolean;
  maxRetries?: number;
  limit?: number;
};

const CRON_HEADER = "x-vercel-cron";
const DEFAULT_LIMIT = Number(process.env.RETRY_FAILED_DISTRIBUTIONS_LIMIT || 10);
const DEFAULT_MAX_RETRIES = Number(process.env.RETRY_FAILED_DISTRIBUTIONS_MAX || 3);

function buildStripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(secret);
}

function buildSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Server misconfigured");
  return createClient(url, key);
}

function requirePlatformAccountId() {
  const value = process.env.STRIPE_PLATFORM_ACCOUNT_ID?.trim();
  if (!value) throw new Error("Missing STRIPE_PLATFORM_ACCOUNT_ID");
  return value;
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

async function processRetryJob(
  options: RetryOptions,
  triggeredByCron: boolean
): Promise<Response> {
  try {
    const { retryAll = false, maxRetries = DEFAULT_MAX_RETRIES, limit = DEFAULT_LIMIT } = options;
    const stripe = buildStripeClient();
    const admin = buildSupabaseAdmin();
    const platformAccountId = requirePlatformAccountId();

    // Query for failed distributions, held payments, and pending distributions
    // Includes:
    // 1. Failed distributions (have failed_at timestamp)
    // 2. Held payments (error contains "Payment held")
    // 3. Pending distributions (no error, no failed_at - just waiting to be distributed)
    // We remove the .or() filter to include all pending distributions, not just failed ones
    const { data: failedDistributions, error: queryError } = await admin
      .from("requests")
      .select(
        `
        id,
        status,
        influencer_id,
        amount_cents,
        application_fee_cents,
        stripe_payment_intent_id,
        payment_distribution_attempts,
        payment_distribution_error,
        payment_distribution_failed_at,
        profiles!requests_influencer_id_fkey (
          id,
          stripe_connect_account_id,
          is_reviewer,
          username,
          first_name,
          last_name,
          email
        )
      `
      )
      .eq("status", "completed")
      .eq("payment_distributed", false)
      .lt("payment_distribution_attempts", maxRetries)
      // Removed .or() filter to include all pending distributions (failed, held, or just pending)
      .limit(retryAll ? 1000 : limit);

    if (queryError) {
      console.error("Failed to fetch failed distributions:", queryError);
      return new Response(JSON.stringify({ error: "Failed to fetch failed distributions" }), { status: 500 });
    }

    if (!failedDistributions || failedDistributions.length === 0) {
      const payload = { success: true, message: "No failed distributions found for retry", processed: 0 };
      if (triggeredByCron) {
        await sendOpsAlert("[Cron] Retry payouts — nothing to process");
      }
      return new Response(JSON.stringify(payload), { status: 200 });
    }

    console.log(`[retry-distributions] Processing ${failedDistributions.length} failed distributions`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const request of failedDistributions) {
      try {
        results.processed++;
        const reviewer = (request as any).profiles;
        const connectAccountId = reviewer?.stripe_connect_account_id;

        if (!connectAccountId) {
          await admin
            .from("requests")
            .update({
              payment_distribution_error:
                "Payment held: reviewer must complete Stripe Connect onboarding before payout.",
              payment_status: "queued",
            })
            .eq("id", request.id);
          results.skipped++;
          results.errors.push({
            requestId: request.id,
            error: "Reviewer has no Stripe Connect account",
            reviewerId: request.influencer_id,
          });
          continue;
        }

        const totalAmount = request.amount_cents || 0;
        const auroFee = request.application_fee_cents || 0;
        const reviewerAmount = totalAmount - auroFee;

        if (reviewerAmount <= 0) {
          results.skipped++;
          results.errors.push({
            requestId: request.id,
            error: "Invalid reviewer amount",
            totalAmount,
            auroFee,
            reviewerAmount,
          });
          continue;
        }

        console.log(
          `[retry-distributions] Retrying distribution for request ${request.id}: $${(reviewerAmount / 100).toFixed(2)}`
        );

        // Resolve a source_transaction (the original charge) so the transfer
        // is anchored to the source charge — Stripe will release the funds
        // when the charge becomes available without requiring the platform
        // balance to currently hold them.
        let sourceTransactionId: string | null = null;
        const piId =
          typeof (request as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id === "string"
            ? (request as { stripe_payment_intent_id: string }).stripe_payment_intent_id
            : null;
        if (piId) {
          try {
            const pi = await stripe.paymentIntents.retrieve(piId);
            const latest = (pi as { latest_charge?: string | { id?: string } | null }).latest_charge;
            if (typeof latest === "string") sourceTransactionId = latest;
            else if (latest && typeof latest === "object" && typeof latest.id === "string") sourceTransactionId = latest.id;
          } catch (piErr) {
            console.warn("[retry-distributions] paymentIntent introspect failed", {
              requestId: request.id,
              piId,
              message: (piErr as { message?: string })?.message,
            });
          }
        }

        if (!sourceTransactionId) {
          const balance = await stripe.balance.retrieve({}, { stripeAccount: platformAccountId });
          const availableBalance = balance.available[0]?.amount || 0;

          if (availableBalance < reviewerAmount) {
            await admin
              .from("requests")
              .update({
                payment_distribution_error: `Insufficient funds: available=${availableBalance}, required=${reviewerAmount}`,
                payment_distribution_failed_at: new Date().toISOString(),
                payment_status: "queued",
              })
              .eq("id", request.id);
            results.failed++;
            results.errors.push({
              requestId: request.id,
              error: "Insufficient funds",
              availableBalance,
              requiredAmount: reviewerAmount,
            });
            continue;
          }
        }

        const transfer = await stripe.transfers.create(
          {
            amount: reviewerAmount,
            currency: "usd",
            destination: connectAccountId,
            ...(sourceTransactionId ? { source_transaction: sourceTransactionId } : {}),
            transfer_group: `review_${request.id}`,
            metadata: {
              request_id: request.id,
              reviewer_id: request.influencer_id,
              auro_fee_cents: auroFee.toString(),
              total_amount_cents: totalAmount.toString(),
              source_account: platformAccountId,
              source_transaction: sourceTransactionId || "none",
              retry_attempt: String((request.payment_distribution_attempts || 0) + 1),
            },
          },
          {
            idempotencyKey: `reviewer-payout-${request.id}-attempt-${(request.payment_distribution_attempts || 0) + 1}`,
          }
        );

        console.log(`[retry-distributions] Transfer created: ${transfer.id}`);

        const { error: updateError } = await admin
          .from("requests")
          .update({
            payment_distributed: true,
            payment_distributed_at: new Date().toISOString(),
            stripe_transfer_id: transfer.id,
            reviewer_amount_cents: reviewerAmount,
            payment_distribution_error: null,
            payment_distribution_failed_at: null,
            payment_status: "paid",
          })
          .eq("id", request.id);

        if (updateError) {
          console.error(`[retry-distributions] Failed to update request ${request.id}:`, updateError);
          results.failed++;
          results.errors.push({
            requestId: request.id,
            error: "Database update failed",
            transferId: transfer.id,
          });
        } else {
          results.successful++;
          console.log(`[retry-distributions] Successfully retried distribution for request ${request.id}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error: any) {
        console.error(`[retry-distributions] Failed to retry request ${request.id}:`, error);
        results.failed++;
        results.errors.push({
          requestId: request.id,
          error: error.message || "Unknown error",
          stripeError: error.code,
        });

        await admin
          .from("requests")
          .update({
            payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
            payment_distribution_error: `Retry failed: ${error.message || "Unknown error"}`,
            payment_distribution_failed_at: new Date().toISOString(),
          })
          .eq("id", request.id);
      }
    }

    console.log(
      `[retry-distributions] Completed retry processing: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`
    );

    if (triggeredByCron) {
      const summary = `[Cron] Retry payouts — processed ${results.processed}, success ${results.successful}, failed ${results.failed}, skipped ${results.skipped}`;
      await sendOpsAlert(summary, results.errors.length ? { errors: results.errors.slice(0, 5) } : undefined);
    } else if (results.failed > 0) {
      await sendOpsAlert("Manual retry payouts — failures detected", { errors: results.errors.slice(0, 10) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} failed distributions`,
        results,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error retrying failed distributions:", error);
    await sendOpsAlert("Retry payouts job crashed", { error: error?.message || error });
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to retry distributions",
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
  return processRetryJob(body, false);
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  return processRetryJob({}, true);
}
