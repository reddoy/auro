import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const REVIEWER_SHARE_BPS = 8000;
const PLATFORM_SHARE_BPS = 2000;

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Missing requestId' }), { status: 400 });
    }

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

    // Get the request details
    const { data: request, error: requestError } = await admin
      .from('requests')
      .select(`
        id,
        status,
        influencer_id,
        amount_cents,
        application_fee_cents,
        stripe_session_id,
        stripe_payment_intent_id,
        payment_distributed,
        reviewer_amount_cents,
        stripe_transfer_id,
        payment_distributed_at,
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
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) {
      console.error('Failed to fetch request:', requestError);
      return new Response(JSON.stringify({ error: 'Failed to fetch request' }), { status: 500 });
    }

    if (!request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    }

    // CRITICAL: Check if already distributed with database-level atomic check
    // This prevents race conditions where multiple concurrent requests could both pass the check
    if (request.payment_distributed) {
      // Double-check with fresh read to ensure no race condition
      const { data: freshRequest } = await admin
        .from('requests')
        .select('payment_distributed, stripe_transfer_id')
        .eq('id', requestId)
        .maybeSingle();
      
      if (freshRequest?.payment_distributed) {
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Payment already distributed',
          alreadyDistributed: true,
          transferId: freshRequest.stripe_transfer_id
        }), { status: 200 });
      }
    }

    // Verify the request is completed
    if (request.status !== 'completed') {
      return new Response(JSON.stringify({ 
        error: 'Request is not completed yet. Payment can only be distributed after review completion.',
        currentStatus: request.status
      }), { status: 400 });
    }

    // CRITICAL: Use database-level locking to prevent race conditions
    // Attempt to atomically mark as "distributing" to prevent concurrent distributions
    const { data: lockResult, error: lockError } = await admin
      .from('requests')
      .update({ 
        payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
        payment_distribution_error: null // Clear any previous errors when retrying
      })
      .eq('id', requestId)
      .eq('payment_distributed', false) // Only update if not already distributed (atomic check)
      .select('id, payment_distributed')
      .maybeSingle();

    // If update failed, it means payment was already distributed by another process
    if (lockError || !lockResult || lockResult.payment_distributed) {
      console.log('[payment-distribution] Payment already being distributed or completed by another process');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Payment distribution already in progress or completed',
        alreadyDistributed: true
      }), { status: 200 });
    }

    // Get reviewer profile - handle both array and object formats from Supabase join
    let reviewer = (request as any).profiles;
    
    // If profile is an array (shouldn't happen but handle it), take first item
    if (Array.isArray(reviewer)) {
      reviewer = reviewer[0];
    }
    
    // If profile join failed or reviewer is missing, fetch directly
    if (!reviewer || !reviewer.id) {
      console.log('⚠️ Profile join failed, fetching reviewer directly:', request.influencer_id);
      const { data: directProfile, error: profileError } = await admin
        .from('profiles')
        .select('id, stripe_connect_account_id, is_reviewer, username, first_name, last_name, email')
        .eq('id', request.influencer_id)
        .maybeSingle();
      
      if (profileError) {
        console.error('❌ Failed to fetch reviewer profile:', profileError);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch reviewer profile',
          details: profileError.message
        }), { status: 500 });
      }
      
      if (!directProfile) {
        return new Response(JSON.stringify({ error: 'Reviewer profile not found' }), { status: 404 });
      }
      
      reviewer = directProfile;
    }
    
    // Log the reviewer data for debugging
    console.log('👤 Reviewer profile data:', {
      id: reviewer.id,
      username: reviewer.username,
      is_reviewer: reviewer.is_reviewer,
      stripe_connect_account_id: reviewer.stripe_connect_account_id ? `${reviewer.stripe_connect_account_id.substring(0, 10)}...` : 'NULL/EMPTY',
      has_stripe_id: !!reviewer.stripe_connect_account_id,
      stripe_id_type: typeof reviewer.stripe_connect_account_id,
      stripe_id_length: reviewer.stripe_connect_account_id?.length || 0
    });
    
    if (!reviewer?.is_reviewer) {
      return new Response(JSON.stringify({ error: 'Invalid reviewer' }), { status: 400 });
    }

    // Compute full_name from first_name and last_name
    const reviewerFullName = reviewer.first_name || reviewer.last_name
      ? [reviewer.first_name, reviewer.last_name].filter(Boolean).join(' ') || null
      : null;

    // Check if reviewer has Stripe Connect account
    // Handle both null and empty string cases
    const connectAccountId = reviewer.stripe_connect_account_id?.trim() || null;
    
    if (!connectAccountId || connectAccountId === '') {
      console.log('❌ No Stripe Connect account found for reviewer:', {
        reviewerId: request.influencer_id,
        reviewerName: reviewerFullName || reviewer.username,
        stripeConnectAccountId: reviewer.stripe_connect_account_id,
        isNull: reviewer.stripe_connect_account_id === null,
        isEmpty: reviewer.stripe_connect_account_id === '',
        isUndefined: reviewer.stripe_connect_account_id === undefined
      });
      
      // Hold payment until Stripe is set up - don't mark as failed, just pending
      await admin
        .from('requests')
        .update({ 
          payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
          payment_distribution_error: 'Payment held: Reviewer has not set up Stripe Connect account. Payment will be distributed once Stripe is connected.',
        })
        .eq('id', requestId);

      // Return success with message that payment is being held
      return new Response(JSON.stringify({ 
        success: true,
        held: true,
        message: 'Payment is being held until reviewer sets up Stripe Connect account.',
        errorType: 'NO_CONNECT_ACCOUNT',
        reviewerId: request.influencer_id,
        reviewerName: reviewerFullName || reviewer.username,
        reviewerEmail: reviewer.email,
        debug: {
          stripeConnectAccountId: reviewer.stripe_connect_account_id,
          isNull: reviewer.stripe_connect_account_id === null,
          isEmpty: reviewer.stripe_connect_account_id === '',
          isUndefined: reviewer.stripe_connect_account_id === undefined
        },
        note: 'Reviewer can still complete reviews. Payment will be distributed automatically once Stripe is connected.'
      }), { status: 200 });
    }
    
    console.log('✅ Stripe Connect account found:', {
      accountId: connectAccountId.substring(0, 10) + '...',
      reviewerId: request.influencer_id
    });

    // Pre-flight check: Verify account status before attempting transfer
    try {
      console.log('🔍 Pre-flight check: Verifying account status for', connectAccountId);
      const account = await stripe.accounts.retrieve(connectAccountId);
      
      console.log('📊 Account Status:', {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements
      });

      // Check if account can receive transfers
      if (!account.payouts_enabled) {
        console.log('❌ Account cannot receive payouts');
        await admin
          .from('requests')
          .update({ 
            payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
            payment_distribution_error: 'Account payouts not enabled',
            payment_distribution_failed_at: new Date().toISOString()
          })
          .eq('id', requestId);

        return new Response(JSON.stringify({ 
          error: 'Reviewer\'s account cannot receive payouts yet.',
          errorType: 'PAYOUTS_DISABLED',
          reviewerId: request.influencer_id,
          reviewerName: reviewerFullName || reviewer.username,
          accountRequirements: account.requirements,
          message: 'The reviewer needs to complete their account setup to enable payouts.'
        }), { status: 400 });
      }

      // Check for pending requirements
      if (account.requirements && (
        (account.requirements.currently_due && account.requirements.currently_due.length > 0) || 
        (account.requirements.past_due && account.requirements.past_due.length > 0)
      )) {
        console.log('⚠️ Account has pending requirements:', {
          currently_due: account.requirements.currently_due,
          past_due: account.requirements.past_due
        });
      }

    } catch (accountCheckError: any) {
      console.error('❌ Pre-flight account check failed:', accountCheckError.message);
      // Continue with transfer attempt - the error might be more specific
    }

    // Calculate the amount to transfer to reviewer
    // SIMPLE MODEL: Customer pays X, Reviewer gets 80%, Auro absorbs Stripe fee
    // Standard fee: 20% for all reviewers
    const totalAmount = request.amount_cents || 0;
    const reviewerAmount = Math.floor((totalAmount * REVIEWER_SHARE_BPS) / 10000);
    const auroFee = totalAmount - reviewerAmount;

    if (reviewerAmount <= 0) {
      return new Response(JSON.stringify({ 
        error: 'Invalid payment amount. Reviewer amount would be zero or negative.',
        totalAmount,
        auroFee,
        reviewerAmount,
        calculation: 'reviewerAmount = totalAmount - auroFee (Auro absorbs Stripe fee)'
      }), { status: 400 });
    }

    try {
      // Check account balance before attempting transfer
      // Only use AVAILABLE balance for transfers (not pending)
      // Use fallback account ID if env var not set (matches retry endpoint behavior)
      const auroAccountId = process.env.STRIPE_PLATFORM_ACCOUNT_ID || "acct_1S0FmFBCrjcqavov";
      if (!auroAccountId) {
        console.error('❌ Missing STRIPE_PLATFORM_ACCOUNT_ID environment variable');
        return new Response(JSON.stringify({ 
          error: 'Server configuration error: Stripe platform account not configured. Please set STRIPE_PLATFORM_ACCOUNT_ID environment variable in Vercel.',
          errorType: 'MISSING_CONFIG',
          note: 'This is your platform\'s Stripe account ID (not the reviewer\'s connect account). Find it in Stripe Dashboard > Settings > Account.'
        }), { status: 500 });
      }
      
      console.log('🔍 Using platform account ID:', auroAccountId.substring(0, 10) + '...');
      
      console.log('🔍 Checking balance for account:', auroAccountId);
      
      // Get balance using the account-specific API
      const balance = await stripe.balance.retrieve({}, { stripeAccount: auroAccountId });
      const availableBalance = balance.available[0]?.amount || 0; // In cents
      const pendingBalance = balance.pending[0]?.amount || 0; // In cents
      
      console.log('💰 Balance details:', {
        accountId: auroAccountId,
        availableBalance: availableBalance,
        availableBalanceUSD: (availableBalance / 100).toFixed(2),
        pendingBalance: pendingBalance,
        pendingBalanceUSD: (pendingBalance / 100).toFixed(2),
        totalAmount: totalAmount,
        totalAmountUSD: (totalAmount / 100).toFixed(2),
        auroFee: auroFee,
        auroFeeUSD: (auroFee / 100).toFixed(2),
        reviewerAmount: reviewerAmount,
        reviewerAmountUSD: (reviewerAmount / 100).toFixed(2),
        calculation: `reviewerAmount = ${totalAmount} - ${auroFee} = ${reviewerAmount} (Auro absorbs Stripe fee)`,
        note: 'Only using AVAILABLE balance for transfers'
      });
      
      // Only use available balance for transfers
      if (availableBalance < reviewerAmount) {
        // Log insufficient funds error
        await admin
          .from('requests')
          .update({ 
            payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
            payment_distribution_error: `Insufficient funds: Available ${availableBalance}, Required ${reviewerAmount}`,
            payment_distribution_failed_at: new Date().toISOString(),
            payment_status: 'queued'
          })
          .eq('id', requestId);

        return new Response(JSON.stringify({ 
          error: 'Insufficient available funds in Auro account to complete this transfer.',
          errorType: 'INSUFFICIENT_FUNDS',
          availableBalance: availableBalance,
          pendingBalance: pendingBalance,
          requiredAmount: reviewerAmount,
          shortfall: reviewerAmount - availableBalance,
          message: `Available: $${(availableBalance / 100).toFixed(2)}, Pending: $${(pendingBalance / 100).toFixed(2)}, Required: $${(reviewerAmount / 100).toFixed(2)}. Only available funds can be used for transfers.`
        }), { status: 400 });
      }

      // Create a transfer to the reviewer's Connect account
      // When transferring from a connected account, we need to use the platform account's API key
      // and specify the source account in the transfer parameters
      console.log('🔄 Creating transfer:', {
        amount: reviewerAmount,
        destination: connectAccountId,
        sourceAccount: auroAccountId,
        reviewerAmountUSD: (reviewerAmount / 100).toFixed(2),
        calculation: `totalAmount (${totalAmount}) - auroFee (${auroFee}) = reviewerAmount (${reviewerAmount})`
      });
      
      let transfer;
      try {
        transfer = await stripe.transfers.create({
          amount: reviewerAmount,
          currency: 'usd',
          destination: connectAccountId,
          transfer_group: `review_${requestId}`,
          metadata: {
            request_id: requestId,
            reviewer_id: request.influencer_id,
            auro_fee_cents: auroFee.toString(),
            total_amount_cents: totalAmount.toString(),
            reviewer_amount_cents: reviewerAmount.toString(),
            source_account: auroAccountId,
            note: 'Auro absorbs Stripe processing fee',
          },
        });
        
        console.log('✅ Transfer created successfully:', {
          transferId: transfer.id,
          amount: transfer.amount,
          destination: transfer.destination
        });
      } catch (transferError: any) {
        console.error('❌ Transfer creation failed:', transferError);
        console.error('❌ Transfer error details:', {
          message: transferError?.message,
          type: transferError?.type,
          code: transferError?.code,
          decline_code: transferError?.decline_code
        });
        
        // Log the transfer error
        await admin
          .from('requests')
          .update({ 
            payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
            payment_distribution_error: `Transfer failed: ${transferError?.message || 'Unknown error'}`,
            payment_distribution_failed_at: new Date().toISOString()
          })
          .eq('id', requestId);

        return new Response(JSON.stringify({ 
          error: 'Transfer creation failed',
          errorType: 'TRANSFER_FAILED',
          details: transferError?.message,
          stripeError: {
            type: transferError?.type,
            code: transferError?.code,
            decline_code: transferError?.decline_code
          }
        }), { status: 400 });
      }
      
      // Update the request to mark payment as distributed
      const { error: updateError } = await admin
        .from('requests')
        .update({ 
          payment_distributed: true,
          payment_distributed_at: new Date().toISOString(),
          stripe_transfer_id: transfer.id,
          reviewer_amount_cents: reviewerAmount,
          application_fee_cents: auroFee,
          payment_distribution_error: null, // Clear any previous errors
          payment_distribution_failed_at: null,
          payment_status: 'paid'
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Failed to update request with payment info:', updateError);
        // Don't fail the request since the transfer was successful
      }

      // Send notification to reviewer about payment
      try {
        if (request.influencer_id) {
          // Get reviewer's push token
          const { data: reviewerProfile } = await admin
            .from('profiles')
            .select('push_token')
            .eq('id', request.influencer_id)
            .maybeSingle();
          
          if (reviewerProfile?.push_token) {
            // Send push notification via Expo API
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
              },
              body: JSON.stringify({
                to: reviewerProfile.push_token,
                sound: 'default',
                title: 'You Just Got Paid! 💰',
                body: `You received $${(reviewerAmount / 100).toFixed(2)} for your review!`,
                data: {
                  type: 'payment_received',
                  requestId: requestId,
                  amount: reviewerAmount,
                },
                priority: 'high',
              }),
            }).catch(err => console.error('Failed to send payment notification:', err));
          }
        }
      } catch (notifError) {
        // Don't fail the payment if notification fails
        console.error('Error sending payment notification:', notifError);
      }

      return new Response(JSON.stringify({ 
        success: true,
        transferId: transfer.id,
        reviewerAmount: reviewerAmount,
        auroFee: auroFee,
        totalAmount: totalAmount,
        reviewerName: reviewerFullName || reviewer.username,
        calculation: `reviewerAmount = totalAmount (${totalAmount}) - auroFee (${auroFee}) = ${reviewerAmount} (Auro absorbs Stripe fee)`,
        message: 'Payment successfully distributed to reviewer'
      }), { status: 200 });

    } catch (stripeError: any) {
      // Handle Stripe-specific errors
      console.error('Stripe transfer failed:', stripeError);
      
      let errorType = 'STRIPE_ERROR';
      let errorMessage = stripeError.message || 'Stripe transfer failed';
      
      if (stripeError.code === 'insufficient_funds') {
        errorType = 'INSUFFICIENT_FUNDS';
        errorMessage = 'Insufficient funds in Auro account';
      } else if (stripeError.code === 'account_invalid') {
        errorType = 'INVALID_CONNECT_ACCOUNT';
        errorMessage = 'Reviewer\'s Stripe Connect account is invalid';
        
        // Try to get more details about the account
        try {
          const account = await stripe.accounts.retrieve(connectAccountId);
          console.log('Account details for debugging:', {
            id: account.id,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            requirements: account.requirements
          });
        } catch (accountError: any) {
          console.log('Could not retrieve account details:', accountError.message);
        }
      }

      // Log the error
      await admin
        .from('requests')
        .update({ 
          payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
          payment_distribution_error: `${errorType}: ${errorMessage}`,
          payment_distribution_failed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      // Check if this is a retryable error and we haven't exceeded max attempts
      const attempts = (request.payment_distribution_attempts || 0) + 1;
      const maxRetries = 3;
      
      if (attempts < maxRetries && (
        errorType === 'INVALID_CONNECT_ACCOUNT' || 
        errorType === 'INSUFFICIENT_FUNDS' ||
        stripeError.code === 'rate_limit'
      )) {
        console.log(`[payment-distribution] Retryable error detected. Attempt ${attempts}/${maxRetries}. Will retry automatically.`);
        
        // Schedule automatic retry (you could use a queue system here)
        // For now, just log that it should be retried
        return new Response(JSON.stringify({ 
          error: errorMessage,
          errorType: errorType,
          stripeErrorCode: stripeError.code,
          reviewerId: request.influencer_id,
          reviewerName: reviewerFullName || reviewer.username,
          message: `Payment distribution failed. Will retry automatically (attempt ${attempts}/${maxRetries}).`,
          willRetry: true,
          retryAttempt: attempts
        }), { status: 500 });
      }

      return new Response(JSON.stringify({ 
        error: errorMessage,
        errorType: errorType,
        stripeErrorCode: stripeError.code,
        reviewerId: request.influencer_id,
        reviewerName: reviewerFullName || reviewer.username,
        message: 'Payment distribution failed. This can be retried manually.'
      }), { status: 500 });
    }

  } catch (error: any) {
    console.error('Error distributing payment:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to distribute payment',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}
