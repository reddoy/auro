#!/usr/bin/env node

/**
 * Manual test script for payment distribution
 * Use this to test with a real request ID from your database
 */

const BASE_URL = 'https://auro-pearl.vercel.app';

async function testPaymentDistribution(requestId) {
  if (!requestId) {
    console.log('❌ Please provide a request ID');
    console.log('Usage: node scripts/test-payment-manual.js <request-id>');
    console.log('');
    console.log('To find a request ID, run this SQL in Supabase:');
    console.log('SELECT id, status, influencer_id, amount_cents FROM requests WHERE status = \'completed\' LIMIT 5;');
    process.exit(1);
  }

  console.log(`🧪 Testing payment distribution for request: ${requestId}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('');

  try {
    const response = await fetch(`${BASE_URL}/api/payments/distribute-reviewer-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId })
    });

    console.log(`📡 Response status: ${response.status}`);
    console.log(`📡 Response ok: ${response.ok}`);
    
    const data = await response.json();
    console.log('📊 Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Payment distribution successful!');
      console.log(`💰 Transfer ID: ${data.transferId}`);
      console.log(`💵 Reviewer Amount: $${(data.reviewerAmount / 100).toFixed(2)}`);
      console.log(`🏢 Auro Fee: $${(data.auroFee / 100).toFixed(2)}`);
      console.log(`📊 Total Amount: $${(data.totalAmount / 100).toFixed(2)}`);
    } else {
      console.log('❌ Payment distribution failed:');
      console.log(`📋 Error: ${data.error}`);
      console.log(`🏷️  Error Type: ${data.errorType}`);
      
      if (data.errorType === 'NO_CONNECT_ACCOUNT') {
        console.log('💡 Solution: Reviewer needs to complete Stripe Connect setup');
        console.log(`   Reviewer: ${data.reviewerName} (${data.reviewerEmail})`);
      } else if (data.errorType === 'INSUFFICIENT_FUNDS') {
        console.log('💡 Solution: Add funds to Auro Stripe account');
        console.log(`   Available: $${(data.availableBalance / 100).toFixed(2)}`);
        console.log(`   Required: $${(data.requiredAmount / 100).toFixed(2)}`);
        console.log(`   Shortfall: $${(data.shortfall / 100).toFixed(2)}`);
      } else if (data.errorType === 'STRIPE_ERROR') {
        console.log('💡 Solution: Check Stripe dashboard for details');
        console.log(`   Stripe Error Code: ${data.stripeErrorCode}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

// Get request ID from command line
const requestId = process.argv[2];
testPaymentDistribution(requestId);
