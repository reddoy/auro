import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const REVIEWER_SHARE_BPS = 8000;
const MAX_RETRIES = 3;

type ErrorType =
  | 'BAD_REQUEST'
  | 'REQUEST_FETCH_FAILED'
  | 'NOT_FOUND'
  | 'INVALID_STATUS'
  | 'MAX_RETRIES_EXCEEDED'
  | 'INVALID_REVIEWER'
  | 'NO_CONNECT_ACCOUNT'
  | 'PAYOUTS_DISABLED'
  | 'INVALID_AMOUNT'
  | 'INSUFFICIENT_FUNDS'
  | 'TRANSFER_FAILED'
  | 'PLATFORM_ACCOUNT_MISMATCH'
  | 'UNKNOWN_ERROR';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

type ExitContext = {
  requestId?: string;
  reviewerId?: string | null;
  reviewerAmount?: number;
  availableBalance?: number;
  pendingBalance?: number;
  platformAccountId?: string;
  connectAccountId?: string | null;
  stripeErrorCode?: string;
  detail?: string;
};

function logExit(errorType: ErrorType, status: number, ctx: ExitContext): void {
  // Single structured line so a Vercel log filter on errorType/requestId is sufficient.
  console.error('[distribute-reviewer-payment] exit', {
    errorType,
    status,
    ...ctx,
  });
}

function paymentError(errorType: ErrorType, message: string, status = 400, ctx: ExitContext = {}) {
  logExit(errorType, status, ctx);
  return new Response(JSON.stringify({ errorType, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function updateRequestSafe(
  admin: SupabaseClient,
  requestId: string,
  patch: Record<string, unknown>,
  context: string
): Promise<void> {
  const { error } = await admin
    .from('requests')
    .update(patch)
    .eq('id', requestId)
    .select('id');
  if (error) {
    // Surface silent failures (e.g. RLS / trigger rejections) so we can diagnose
    // why a row stayed in a stuck state.
    console.error('[distribute-reviewer-payment] db update failed', {
      context,
      requestId,
      error: error.message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
  }
}

export async function POST(req: Request) {
  let requestId = '';
  try {
    const body = await req.json().catch(() => ({}));
    requestId = typeof body?.requestId === 'string' ? body.requestId : '';
    if (!requestId) {
      return paymentError('BAD_REQUEST', 'Missing requestId');
    }

    const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
    const admin = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));
    const platformAccountId = requireEnv('STRIPE_PLATFORM_ACCOUNT_ID');

    const { data: request, error: requestError } = await admin
      .from('requests')
      .select(`
        id,
        status,
        influencer_id,
        amount_cents,
        application_fee_cents,
        payment_distributed,
        stripe_transfer_id,
        stripe_payment_intent_id,
        payment_distribution_attempts,
        profiles!requests_influencer_id_fkey (
          id,
          stripe_connect_account_id,
          is_reviewer,
          username,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) {
      return paymentError('REQUEST_FETCH_FAILED', 'Failed to fetch request', 500, {
        requestId,
        detail: requestError.message,
      });
    }
    if (!request) {
      return paymentError('NOT_FOUND', 'Request not found', 404, { requestId });
    }
    if (request.payment_distributed) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyDistributed: true,
          transferId: request.stripe_transfer_id || null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (request.status !== 'completed') {
      return paymentError(
        'INVALID_STATUS',
        `Request is ${request.status}. Must be completed before payout.`,
        400,
        { requestId, detail: `status=${request.status}` }
      );
    }

    const priorAttempts = request.payment_distribution_attempts || 0;
    if (priorAttempts >= MAX_RETRIES) {
      return paymentError(
        'MAX_RETRIES_EXCEEDED',
        `Reached max payout attempts (${MAX_RETRIES}).`,
        400,
        { requestId, detail: `attempts=${priorAttempts}` }
      );
    }

    const nextAttempt = priorAttempts + 1;
    const { data: lockResult } = await admin
      .from('requests')
      .update({
        payment_distribution_attempts: nextAttempt,
        payment_distribution_error: null,
      })
      .eq('id', requestId)
      .eq('payment_distributed', false)
      .select('id, payment_distributed')
      .maybeSingle();

    if (!lockResult || lockResult.payment_distributed) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyDistributed: true,
          message: 'Distribution is already in progress or completed.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let reviewer = (request as any).profiles;
    if (Array.isArray(reviewer)) reviewer = reviewer[0];
    if (!reviewer?.id) {
      const { data: directReviewer } = await admin
        .from('profiles')
        .select('id, stripe_connect_account_id, is_reviewer, username, first_name, last_name, email')
        .eq('id', request.influencer_id)
        .maybeSingle();
      reviewer = directReviewer;
    }

    if (!reviewer?.is_reviewer) {
      await updateRequestSafe(
        admin,
        requestId,
        {
          payment_distribution_error: 'Invalid reviewer for payout',
          payment_distribution_failed_at: new Date().toISOString(),
        },
        'INVALID_REVIEWER'
      );
      return paymentError('INVALID_REVIEWER', 'Invalid reviewer', 400, {
        requestId,
        reviewerId: request.influencer_id,
      });
    }

    const reviewerName =
      [reviewer.first_name, reviewer.last_name].filter(Boolean).join(' ') ||
      reviewer.username ||
      'Reviewer';
    const connectAccountId = reviewer.stripe_connect_account_id?.trim() || null;
    if (!connectAccountId) {
      await updateRequestSafe(
        admin,
        requestId,
        {
          payment_distribution_error:
            'Payment held: reviewer must complete Stripe Connect onboarding before payout.',
          payment_status: 'queued',
        },
        'NO_CONNECT_ACCOUNT'
      );
      logExit('NO_CONNECT_ACCOUNT', 200, { requestId, reviewerId: request.influencer_id });
      return new Response(
        JSON.stringify({
          success: true,
          held: true,
          errorType: 'NO_CONNECT_ACCOUNT',
          message: 'Payment held until reviewer connects Stripe.',
          reviewerName,
          reviewerEmail: reviewer.email || null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Introspect the PaymentIntent once and reuse what we learn:
    //   - transfer_data.destination → destination-charge fast path (no new transfer)
    //   - latest_charge → source_transaction for the transfer below, so the
    //     transfer is linked to the original charge and Stripe will release the
    //     funds the moment that charge becomes available, even if the platform
    //     balance is currently zero. This is the standard "separate charges and
    //     transfers" pattern and removes the test-mode pending-vs-available
    //     foot-gun entirely.
    const piId =
      typeof (request as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id === 'string'
        ? (request as { stripe_payment_intent_id: string }).stripe_payment_intent_id
        : null;
    let sourceTransactionId: string | null = null;
    if (piId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(piId);
        const td = (pi as { transfer_data?: { destination?: string | null } | null }).transfer_data;
        const tdDestination = td?.destination || null;
        const latest = (pi as { latest_charge?: string | { id?: string } | null }).latest_charge;
        if (typeof latest === 'string') {
          sourceTransactionId = latest;
        } else if (latest && typeof latest === 'object' && typeof latest.id === 'string') {
          sourceTransactionId = latest.id;
        }
        if (tdDestination && tdDestination === connectAccountId) {
          await updateRequestSafe(
            admin,
            requestId,
            {
              payment_distributed: true,
              payment_distributed_at: new Date().toISOString(),
              // Use the existing PI as the payout marker — no new transfer was needed.
              stripe_transfer_id: piId,
              reviewer_amount_cents: Math.floor(((request.amount_cents || 0) * REVIEWER_SHARE_BPS) / 10000),
              payment_distribution_error: null,
              payment_distribution_failed_at: null,
              payment_status: 'paid',
            },
            'DESTINATION_CHARGE_SETTLED'
          );
          console.log('[distribute-reviewer-payment] destination-charge settled', {
            requestId,
            reviewerId: request.influencer_id,
            connectAccountId,
            paymentIntentId: piId,
          });
          return new Response(
            JSON.stringify({
              success: true,
              destinationCharge: true,
              alreadyDistributed: true,
              paymentIntentId: piId,
              message: 'Funds already routed via destination charge at checkout; marked paid.',
              reviewerName,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (piErr) {
        // Non-fatal: if we can't introspect the PI (e.g. live key vs test PI),
        // fall through to the normal transfer path with no source_transaction.
        console.warn('[distribute-reviewer-payment] paymentIntent introspect failed', {
          requestId,
          piId,
          message: (piErr as { message?: string })?.message,
          code: (piErr as { code?: string })?.code,
        });
      }
    }

    // Validate that the configured platform account matches the key in use.
    // A mismatch silently yields a $0 balance and an unhelpful INSUFFICIENT_FUNDS,
    // which is exactly the failure mode we just diagnosed.
    let keyAccountId: string | null = null;
    try {
      const acct = await stripe.accounts.retrieve();
      keyAccountId = acct.id || null;
    } catch (acctErr) {
      console.warn('[distribute-reviewer-payment] could not retrieve account for key', {
        requestId,
        message: (acctErr as { message?: string })?.message,
        code: (acctErr as { code?: string })?.code,
      });
    }
    if (keyAccountId && keyAccountId !== platformAccountId) {
      await updateRequestSafe(
        admin,
        requestId,
        {
          payment_distribution_error: `PLATFORM_ACCOUNT_MISMATCH: STRIPE_SECRET_KEY belongs to ${keyAccountId}, STRIPE_PLATFORM_ACCOUNT_ID=${platformAccountId}.`,
          payment_distribution_failed_at: new Date().toISOString(),
          payment_status: 'queued',
        },
        'PLATFORM_ACCOUNT_MISMATCH'
      );
      return paymentError(
        'PLATFORM_ACCOUNT_MISMATCH',
        'Stripe configuration mismatch: secret key and platform account do not match.',
        500,
        {
          requestId,
          platformAccountId,
          detail: `keyAccountId=${keyAccountId}`,
        }
      );
    }

    let account: Stripe.Account;
    try {
      account = await stripe.accounts.retrieve(connectAccountId);
    } catch (acctErr: any) {
      await updateRequestSafe(
        admin,
        requestId,
        {
          payment_distribution_error: `Failed to retrieve reviewer account: ${acctErr?.message || 'unknown'}`,
          payment_distribution_failed_at: new Date().toISOString(),
          payment_status: 'queued',
        },
        'PAYOUTS_DISABLED_RETRIEVE'
      );
      return paymentError('PAYOUTS_DISABLED', 'Reviewer account is not payout-ready.', 400, {
        requestId,
        connectAccountId,
        stripeErrorCode: acctErr?.code,
        detail: acctErr?.message,
      });
    }
    if (!account.payouts_enabled) {
      await updateRequestSafe(
        admin,
        requestId,
        {
          payment_distribution_error: 'Reviewer payouts are not enabled in Stripe Connect.',
          payment_distribution_failed_at: new Date().toISOString(),
          payment_status: 'queued',
        },
        'PAYOUTS_DISABLED'
      );
      return paymentError('PAYOUTS_DISABLED', 'Reviewer account is not payout-ready.', 400, {
        requestId,
        connectAccountId,
      });
    }

    const totalAmount = request.amount_cents || 0;
    const reviewerAmount = Math.floor((totalAmount * REVIEWER_SHARE_BPS) / 10000);
    const auroFee = totalAmount - reviewerAmount;
    if (reviewerAmount <= 0) {
      await updateRequestSafe(
        admin,
        requestId,
        {
          payment_distribution_error: `Invalid payout amount: ${reviewerAmount}`,
          payment_distribution_failed_at: new Date().toISOString(),
        },
        'INVALID_AMOUNT'
      );
      return paymentError('INVALID_AMOUNT', 'Reviewer amount resolved to zero.', 400, {
        requestId,
        reviewerAmount,
      });
    }

    // When we have a source_transaction, Stripe links the transfer to the
    // original charge and releases funds the moment that charge becomes
    // available — no need for the platform balance to currently hold them.
    // Skip the balance pre-check in that case; only fall back to the check
    // when we have no source charge to anchor to (legacy rows / missing PI).
    let availableBalance = 0;
    let pendingBalance = 0;
    if (!sourceTransactionId) {
      const balance = await stripe.balance.retrieve({}, { stripeAccount: platformAccountId });
      availableBalance = balance.available[0]?.amount || 0;
      pendingBalance = balance.pending[0]?.amount || 0;
      if (availableBalance < reviewerAmount) {
        await updateRequestSafe(
          admin,
          requestId,
          {
            payment_distribution_error: `Insufficient funds: available=${availableBalance}, pending=${pendingBalance}, required=${reviewerAmount}`,
            payment_distribution_failed_at: new Date().toISOString(),
            payment_status: 'queued',
          },
          'INSUFFICIENT_FUNDS'
        );
        return paymentError('INSUFFICIENT_FUNDS', 'Insufficient available balance for payout.', 400, {
          requestId,
          reviewerAmount,
          availableBalance,
          pendingBalance,
          platformAccountId,
          detail: 'no source_transaction available; required balance not present',
        });
      }
    }

    let transfer: Stripe.Transfer;
    try {
      transfer = await stripe.transfers.create(
        {
          amount: reviewerAmount,
          currency: 'usd',
          destination: connectAccountId,
          ...(sourceTransactionId ? { source_transaction: sourceTransactionId } : {}),
          transfer_group: `review_${requestId}`,
          metadata: {
            request_id: requestId,
            reviewer_id: request.influencer_id,
            total_amount_cents: String(totalAmount),
            reviewer_amount_cents: String(reviewerAmount),
            auro_fee_cents: String(auroFee),
            attempt: String(nextAttempt),
            source_account: platformAccountId,
            source_transaction: sourceTransactionId || 'none',
          },
        },
        { idempotencyKey: `reviewer-payout-${requestId}-attempt-${nextAttempt}` }
      );
    } catch (error: any) {
      const isInsufficient = error?.code === 'insufficient_funds';
      const isAccount = error?.code === 'account_invalid' || error?.code === 'no_account';
      const errorType: ErrorType = isInsufficient
        ? 'INSUFFICIENT_FUNDS'
        : isAccount
          ? 'TRANSFER_FAILED'
          : 'TRANSFER_FAILED';

      await updateRequestSafe(
        admin,
        requestId,
        {
          payment_distribution_error: `${errorType}: ${error?.message || 'Unknown Stripe error'}`,
          payment_distribution_failed_at: new Date().toISOString(),
          payment_status: 'queued',
        },
        errorType
      );

      return paymentError(errorType, error?.message || 'Stripe transfer failed', 400, {
        requestId,
        reviewerAmount,
        availableBalance,
        pendingBalance,
        platformAccountId,
        connectAccountId,
        stripeErrorCode: error?.code,
        detail: error?.message,
      });
    }

    await updateRequestSafe(
      admin,
      requestId,
      {
        payment_distributed: true,
        payment_distributed_at: new Date().toISOString(),
        stripe_transfer_id: transfer.id,
        reviewer_amount_cents: reviewerAmount,
        application_fee_cents: auroFee,
        payment_distribution_error: null,
        payment_distribution_failed_at: null,
        payment_status: 'paid',
      },
      'SUCCESS'
    );

    return new Response(
      JSON.stringify({
        success: true,
        transferId: transfer.id,
        reviewerName,
        totalAmount,
        reviewerAmount,
        auroFee,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return paymentError('UNKNOWN_ERROR', error?.message || 'Failed to distribute payment', 500, {
      requestId,
      detail: error?.stack || error?.message,
    });
  }
}
