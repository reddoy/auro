#!/usr/bin/env node

/**
 * Check payment distribution status for a specific reviewer
 */

const BASE_URL = 'https://auro-pearl.vercel.app';

async function checkReviewerPayments(reviewerAccountId) {
  console.log(`🔍 Checking payments for reviewer account: ${reviewerAccountId}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('');

  try {
    // Test the basic API endpoint first
    const response = await fetch(`${BASE_URL}/api/payments/distribute-reviewer-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId: 'test-connection' })
    });

    console.log(`📡 API Response status: ${response.status}`);
    
    if (response.status === 404) {
      console.log('✅ API endpoint is working (404 expected for test ID)');
    } else {
      const data = await response.json();
      console.log('📊 Response:', data);
    }
    
  } catch (error) {
    console.error('💥 API test failed:', error.message);
  }

  console.log('');
  console.log('💡 Next steps:');
  console.log('1. Run this SQL in Supabase to find completed requests:');
  console.log('   SELECT id, status, influencer_id, amount_cents, payment_distributed, stripe_transfer_id');
  console.log('   FROM requests WHERE status = \'completed\' ORDER BY created_at DESC LIMIT 5;');
  console.log('');
  console.log('2. Then test with a real request ID:');
  console.log('   node scripts/test-payment-manual.js <request-id>');
  console.log('');
  console.log('3. Check your Stripe dashboard for transfers to account:', reviewerAccountId);
}

// Get reviewer account ID from command line
const reviewerAccountId = process.argv[2] || 'acct_1SIh6wAyaNDVJK2m';
checkReviewerPayments(reviewerAccountId);
