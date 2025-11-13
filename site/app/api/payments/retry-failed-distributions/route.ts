import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { retryAll = false, maxRetries = 3, limit = 10 } = await req.json();

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }
    const stripe = new Stripe(secret);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // Get failed payment distributions that can be retried
    const { data: failedDistributions, error: queryError } = await admin
      .from('requests')
      .select(`
        id,
        status,
        influencer_id,
        amount_cents,
        application_fee_cents,
        payment_distribution_attempts,
        payment_distribution_error,
        payment_distribution_failed_at,
        profiles!requests_influencer_id_fkey (
          id,
          stripe_connect_account_id,
          is_reviewer,
          username,
          full_name,
          email
        )
      `)
      .eq('status', 'completed')
      .eq('payment_distributed', false)
      .lt('payment_distribution_attempts', maxRetries)
      .not('payment_distribution_failed_at', 'is', null)
      .limit(retryAll ? 1000 : limit);

    if (queryError) {
      console.error('Failed to fetch failed distributions:', queryError);
      return new Response(JSON.stringify({ error: 'Failed to fetch failed distributions' }), { status: 500 });
    }

    if (!failedDistributions || failedDistributions.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No failed distributions found for retry',
        processed: 0
      }), { status: 200 });
    }

    console.log(`[retry-distributions] Processing ${failedDistributions.length} failed distributions`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[]
    };

    // Process each failed distribution
    for (const request of failedDistributions) {
      try {
        results.processed++;
        
        const reviewer = (request as any).profiles;
        const connectAccountId = reviewer?.stripe_connect_account_id;
        
        // Skip if reviewer doesn't have Connect account
        if (!connectAccountId) {
          results.skipped++;
          results.errors.push({
            requestId: request.id,
            error: 'Reviewer has no Stripe Connect account',
            reviewerId: request.influencer_id
          });
          continue;
        }

        // Calculate reviewer amount
        // SIMPLE MODEL: Customer pays X, Reviewer gets 80%, Auro absorbs Stripe fee
        // Standard fee: 20% for all reviewers
        const totalAmount = request.amount_cents || 0;
        const auroFee = request.application_fee_cents || 0;
        // Reviewer receives: total amount minus Auro's platform fee (80% of total)
        const reviewerAmount = totalAmount - auroFee;

        if (reviewerAmount <= 0) {
          results.skipped++;
          results.errors.push({
            requestId: request.id,
            error: 'Invalid reviewer amount',
            totalAmount,
            auroFee,
            reviewerAmount
          });
          continue;
        }

        console.log(`[retry-distributions] Retrying distribution for request ${request.id}: $${(reviewerAmount / 100).toFixed(2)}`);

        // Check account balance
        const auroAccountId = 'acct_1S0FmFBCrjcqavov'; // Correct test account ID
        const balance = await stripe.balance.retrieve({}, { stripeAccount: auroAccountId });
        const availableBalance = balance.available[0]?.amount || 0;

        if (availableBalance < reviewerAmount) {
          results.failed++;
          results.errors.push({
            requestId: request.id,
            error: 'Insufficient funds',
            availableBalance,
            requiredAmount: reviewerAmount
          });
          continue;
        }

        // Create transfer
        const transfer = await stripe.transfers.create({
          amount: reviewerAmount,
          currency: 'usd',
          destination: connectAccountId,
          transfer_group: `review_${request.id}`,
          metadata: {
            request_id: request.id,
            reviewer_id: request.influencer_id,
            auro_fee_cents: auroFee.toString(),
            total_amount_cents: totalAmount.toString(),
            source_account: auroAccountId,
            retry_attempt: (request.payment_distribution_attempts || 0) + 1
          },
        });

        console.log(`[retry-distributions] Transfer created: ${transfer.id}`);

        // Update request with successful distribution
        const { error: updateError } = await admin
          .from('requests')
          .update({
            payment_distributed: true,
            payment_distributed_at: new Date().toISOString(),
            stripe_transfer_id: transfer.id,
            reviewer_amount_cents: reviewerAmount,
            payment_distribution_error: null,
            payment_distribution_failed_at: null,
            payment_status: 'paid'
          })
          .eq('id', request.id);

        if (updateError) {
          console.error(`[retry-distributions] Failed to update request ${request.id}:`, updateError);
          results.failed++;
          results.errors.push({
            requestId: request.id,
            error: 'Database update failed',
            transferId: transfer.id
          });
        } else {
          results.successful++;
          console.log(`[retry-distributions] Successfully retried distribution for request ${request.id}`);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.error(`[retry-distributions] Failed to retry request ${request.id}:`, error);
        results.failed++;
        results.errors.push({
          requestId: request.id,
          error: error.message || 'Unknown error',
          stripeError: error.code
        });

        // Update attempt count
        await admin
          .from('requests')
          .update({
            payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
            payment_distribution_error: `Retry failed: ${error.message || 'Unknown error'}`,
            payment_distribution_failed_at: new Date().toISOString()
          })
          .eq('id', request.id);
      }
    }

    console.log(`[retry-distributions] Completed retry processing: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.processed} failed distributions`,
      results: results
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error retrying failed distributions:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to retry distributions',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}
