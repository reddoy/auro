#!/usr/bin/env node

/**
 * Test to check which Stripe account the API is using
 */

const BASE_URL = 'https://www.appauro.com';

async function testStripeAccount() {
  console.log('🔍 Testing which Stripe account the API is checking...');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('');

  try {
    const response = await fetch(`${BASE_URL}/api/payments/distribute-reviewer-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId: 'a2f6216a-9a3e-4752-86be-ccc12bb7485d' })
    });

    console.log(`📡 Response status: ${response.status}`);
    
    const data = await response.json();
    console.log('📊 Response data:', JSON.stringify(data, null, 2));
    
    if (data.errorType === 'INSUFFICIENT_FUNDS') {
      console.log('');
      console.log('🔍 Analysis:');
      console.log(`   Available Balance: $${(data.availableBalance / 100).toFixed(2)}`);
      console.log(`   Required Amount: $${(data.requiredAmount / 100).toFixed(2)}`);
      console.log(`   Shortfall: $${(data.shortfall / 100).toFixed(2)}`);
      console.log('');
      
      if (data.availableBalance === 600) {
        console.log('❌ The API is still checking the wrong Stripe account ($6.00)');
        console.log('💡 This means the updated code hasn\'t been deployed yet');
        console.log('');
        console.log('🔧 Solutions:');
        console.log('1. Deploy the updated code to production');
        console.log('2. Check if the API is using the correct Stripe account ID');
        console.log('3. Verify the Stripe account configuration');
      } else {
        console.log('✅ The API is checking the correct account');
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testStripeAccount();
