import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// Verify Apple receipt and create request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      receipt,
      productId,
      transactionId,
      creatorId,
      creatorSlug,
      uploadSessionId,
      reviewPayload,
    } = body;

    if (!receipt || !productId || !transactionId) {
      return NextResponse.json(
        { error: 'Missing required fields: receipt, productId, transactionId' },
        { status: 400 }
      );
    }

    if (!creatorId && !creatorSlug) {
      return NextResponse.json(
        { error: 'Missing creatorId or creatorSlug' },
        { status: 400 }
      );
    }

    console.log('[verify-iap] Verifying Apple receipt...');

    // Get Supabase client first (needed for idempotency check)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, supabaseKey);

    // ============================================
    // STEP 1: Check idempotency (prevent duplicate transactions)
    // ============================================
    const { data: existingRequest } = await admin
      .from('requests')
      .select('id')
      .eq('iap_transaction_id', transactionId)
      .maybeSingle();

    if (existingRequest) {
      console.log('[verify-iap] Transaction already processed:', transactionId);
      return NextResponse.json({
        success: true,
        requestId: existingRequest.id,
        message: 'Transaction already processed',
      });
    }

    // ============================================
    // STEP 2: Verify receipt with Apple's servers
    // ============================================
    const appStoreSharedSecret = process.env.APP_STORE_SHARED_SECRET || '';
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Try production first, then sandbox if it fails
    const verifyUrl = isProduction
      ? 'https://buy.itunes.apple.com/verifyReceipt'
      : 'https://sandbox.itunes.apple.com/verifyReceipt';

    console.log('[verify-iap] Verifying with Apple:', verifyUrl);

    const verifyPayload: any = {
      'receipt-data': receipt,
    };

    // Add shared secret if available (recommended for security)
    if (appStoreSharedSecret) {
      verifyPayload.password = appStoreSharedSecret;
    }

    let verificationResult: any;
    try {
      const verifyResponse = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyPayload),
      });

      if (!verifyResponse.ok) {
        throw new Error(`Apple verification request failed: ${verifyResponse.status}`);
      }

      verificationResult = await verifyResponse.json();
      console.log('[verify-iap] Apple verification status:', verificationResult.status);

      // Status 21007 means receipt is from sandbox but we're using production endpoint
      // Retry with sandbox endpoint
      if (verificationResult.status === 21007 && isProduction) {
        console.log('[verify-iap] Receipt is from sandbox, retrying with sandbox endpoint...');
        const sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(verifyPayload),
        });
        verificationResult = await sandboxResponse.json();
        console.log('[verify-iap] Sandbox verification status:', verificationResult.status);
      }
    } catch (error: any) {
      console.error('[verify-iap] Receipt verification error:', error);
      return NextResponse.json(
        { error: 'Failed to verify receipt with Apple', details: error.message },
        { status: 500 }
      );
    }

    // ============================================
    // STEP 3: Validate verification response
    // ============================================
    // Status 0 = valid receipt
    if (verificationResult.status !== 0) {
      const statusMessages: Record<number, string> = {
        21000: 'The App Store could not read the receipt data',
        21002: 'The receipt data was malformed',
        21003: 'The receipt could not be authenticated',
        21004: 'The shared secret does not match',
        21005: 'The receipt server is not available',
        21006: 'This receipt is valid but the subscription has expired',
        21007: 'This receipt is from the sandbox environment',
        21008: 'This receipt is from the production environment',
        21010: 'This receipt could not be authorized',
      };

      const errorMessage = statusMessages[verificationResult.status] || `Unknown error (status: ${verificationResult.status})`;
      console.error('[verify-iap] Receipt validation failed:', errorMessage);
      return NextResponse.json(
        { error: `Receipt validation failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    // ============================================
    // STEP 4: Verify product ID matches
    // ============================================
    const receiptData = verificationResult.receipt;
    const inAppPurchases = receiptData?.in_app || [];
    
    // Find the transaction in the receipt
    const matchingTransaction = inAppPurchases.find(
      (purchase: any) => purchase.transaction_id === transactionId
    );

    if (!matchingTransaction) {
      console.error('[verify-iap] Transaction not found in receipt');
      return NextResponse.json(
        { error: 'Transaction not found in receipt' },
        { status: 400 }
      );
    }

    // Verify product ID matches
    if (matchingTransaction.product_id !== productId) {
      console.error('[verify-iap] Product ID mismatch:', {
        expected: productId,
        found: matchingTransaction.product_id,
      });
      return NextResponse.json(
        { error: 'Product ID mismatch' },
        { status: 400 }
      );
    }

    console.log('[verify-iap] Receipt verified successfully');

    // Resolve creator ID
    let resolvedCreatorId: string | undefined = creatorId;
    if (!resolvedCreatorId && creatorSlug) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id, hourly_rate')
        .eq('username', creatorSlug)
        .eq('is_reviewer', 'approved')
        .maybeSingle();
      
      if (profile) {
        resolvedCreatorId = (profile as any)?.id;
      }
    }

    if (!resolvedCreatorId) {
      return NextResponse.json(
        { error: 'Reviewer not found' },
        { status: 400 }
      );
    }

    // Get reviewer's hourly rate to determine price
    const { data: reviewerProfile } = await admin
      .from('profiles')
      .select('hourly_rate')
      .eq('id', resolvedCreatorId)
      .maybeSingle();

    const hourlyRate = Number((reviewerProfile as any)?.hourly_rate) || 75;
    
    // Extract tier from product ID (format: com.auro.app.review.{tier})
    // The product ID contains the tier (web price), not the IAP price
    const productIdMatch = productId.match(/\.review\.(\d+)$/);
    const tierFromProductId = productIdMatch ? Number(productIdMatch[1]) : null;
    
    // Use tier from product ID if available, otherwise use reviewer's rate
    // The tier represents the web price (what customer pays on web)
    const webPrice = tierFromProductId || hourlyRate;
    const priceCents = Math.round(webPrice * 100);

    // Calculate fees
    // For IAP: Apple takes 30%, we want to preserve 20% margin
    // So: IAP_price * 0.7 * 0.2 = web_price * 0.2
    // Therefore: IAP_price = web_price / 0.7
    // But we already calculated IAP_price on the client, so we use that
    // The actual amount received after Apple's cut: priceCents * 0.7
    const amountAfterAppleCut = Math.round(priceCents * 0.7);
    const auroFeeBps = 2000; // 20%
    const applicationFeeCents = Math.floor((amountAfterAppleCut * auroFeeBps) / 10000);
    const finalApplicationFeeCents = Math.min(applicationFeeCents, amountAfterAppleCut - 50);

    // Get user ID from auth header if available
    const authHeader = req.headers.get('authorization');
    let userId: string | undefined;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await admin.auth.getUser(token);
        userId = user?.id;
      } catch (e) {
        console.warn('[verify-iap] Failed to get user from token:', e);
      }
    }

    // Create request in database
    const requestData: any = {
      influencer_id: resolvedCreatorId,
      status: 'paid',
      amount_cents: priceCents,
      application_fee_cents: finalApplicationFeeCents,
      payment_method: 'iap',
      iap_transaction_id: transactionId,
      iap_product_id: productId,
      iap_receipt: receipt,
      payment_status: 'completed',
    };

    if (userId) {
      requestData.user_id = userId;
    }

    if (uploadSessionId) {
      requestData.upload_session_id = uploadSessionId;
    }

    if (reviewPayload?.message) {
      requestData.message = reviewPayload.message;
    }

    if (reviewPayload?.photos && Array.isArray(reviewPayload.photos)) {
      requestData.photos = reviewPayload.photos;
    }

    if (reviewPayload?.consent) {
      requestData.consent = reviewPayload.consent;
      requestData.share_on_social = reviewPayload.consent;
    }

    const { data: request, error: requestError } = await admin
      .from('requests')
      .insert(requestData)
      .select('id')
      .single();

    if (requestError || !request) {
      console.error('[verify-iap] Failed to create request:', requestError);
      return NextResponse.json(
        { error: 'Failed to create request', details: requestError?.message },
        { status: 500 }
      );
    }

    console.log('[verify-iap] Request created successfully:', request.id);

    return NextResponse.json({
      success: true,
      requestId: request.id,
    });
  } catch (error: any) {
    console.error('[verify-iap] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify purchase' },
      { status: 500 }
    );
  }
}
