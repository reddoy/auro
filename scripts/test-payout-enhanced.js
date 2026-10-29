#!/usr/bin/env node

/**
 * Enhanced test script for the payout distribution system
 * This script helps verify that the payment distribution is working correctly
 * and tests error scenarios
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://auro-pearl.vercel.app';

async function testPayoutDistribution(requestId) {
  console.log(`🧪 Testing payout distribution for request: ${requestId}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/payments/distribute-reviewer-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Payment distribution successful!');
      console.log('📊 Results:', {
        transferId: data.transferId,
        reviewerAmount: `$${(data.reviewerAmount / 100).toFixed(2)}`,
        auroFee: `$${(data.auroFee / 100).toFixed(2)}`,
        totalAmount: `$${(data.totalAmount / 100).toFixed(2)}`,
        reviewerName: data.reviewerName
      });
    } else {
      console.log('❌ Payment distribution failed:');
      console.log('📋 Error:', data.error);
      console.log('🏷️  Error Type:', data.errorType);
      console.log('📊 Details:', data);
      
      // Provide specific guidance based on error type
      if (data.errorType === 'NO_CONNECT_ACCOUNT') {
        console.log('💡 Solution: Ask reviewer to complete Stripe Connect setup');
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

async function testRetryDistribution(requestId, maxRetries = 3) {
  console.log(`🔄 Testing retry distribution for request: ${requestId}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/payments/retry-distribution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId, maxRetries })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Retry distribution successful!');
      console.log('📊 Results:', {
        transferId: data.transferId,
        reviewerAmount: `$${(data.reviewerAmount / 100).toFixed(2)}`,
        attempts: data.attempts,
        reviewerName: data.reviewerName
      });
    } else {
      console.log('❌ Retry distribution failed:');
      console.log('📋 Error:', data.error);
      console.log('🏷️  Error Type:', data.errorType);
      console.log('🔢 Attempts:', data.attempts);
      console.log('📊 Details:', data);
    }
  } catch (error) {
    console.error('💥 Retry test failed with error:', error.message);
  }
}

async function getPaymentDashboard() {
  console.log('📊 Fetching payment distribution dashboard...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/payment-dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Dashboard data retrieved!');
      console.log('📈 Statistics:', data.stats);
      console.log('❌ Failed Payments:', data.failedPayments?.length || 0);
      
      if (data.failedPayments && data.failedPayments.length > 0) {
        console.log('\n🔍 Recent Failed Payments:');
        data.failedPayments.slice(0, 5).forEach((payment, index) => {
          console.log(`${index + 1}. Request ${payment.request_id}`);
          console.log(`   Reviewer: ${payment.reviewer_name || payment.reviewer_username}`);
          console.log(`   Error: ${payment.payment_distribution_error}`);
          console.log(`   Amount: $${((payment.amount_cents - payment.application_fee_cents) / 100).toFixed(2)}`);
          console.log(`   Attempts: ${payment.payment_distribution_attempts}`);
          console.log(`   Failed: ${new Date(payment.payment_distribution_failed_at).toLocaleString()}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Failed to fetch dashboard:', data.error);
    }
  } catch (error) {
    console.error('💥 Dashboard fetch failed:', error.message);
  }
}

async function testAdminAction(action, requestId) {
  console.log(`🔧 Testing admin action: ${action} for request: ${requestId}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/payment-dashboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, requestId })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Admin action successful!');
      console.log('📊 Result:', data);
    } else {
      console.log('❌ Admin action failed:');
      console.log('📋 Error:', data.error);
    }
  } catch (error) {
    console.error('💥 Admin action failed:', error.message);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const requestId = args[1];
const maxRetries = parseInt(args[2]) || 3;

if (!command) {
  console.log('Usage: node test-payout.js <command> [request-id] [max-retries]');
  console.log('');
  console.log('Commands:');
  console.log('  test <request-id>           - Test normal payment distribution');
  console.log('  retry <request-id> [max]    - Test retry payment distribution');
  console.log('  dashboard                   - Get payment dashboard statistics');
  console.log('  reset <request-id>          - Reset payment distribution attempts');
  console.log('  manual <request-id>         - Mark payment as manually resolved');
  console.log('');
  console.log('Examples:');
  console.log('  node test-payout.js test 123e4567-e89b-12d3-a456-426614174000');
  console.log('  node test-payout.js retry 123e4567-e89b-12d3-a456-426614174000 5');
  console.log('  node test-payout.js dashboard');
  process.exit(1);
}

console.log('🚀 Starting payout distribution tests...');
console.log(`🌐 Base URL: ${BASE_URL}`);
console.log(`📝 Command: ${command}`);
if (requestId) console.log(`🆔 Request ID: ${requestId}`);
console.log('');

switch (command) {
  case 'test':
    if (!requestId) {
      console.error('❌ Request ID required for test command');
      process.exit(1);
    }
    await testPayoutDistribution(requestId);
    break;
    
  case 'retry':
    if (!requestId) {
      console.error('❌ Request ID required for retry command');
      process.exit(1);
    }
    await testRetryDistribution(requestId, maxRetries);
    break;
    
  case 'dashboard':
    await getPaymentDashboard();
    break;
    
  case 'reset':
    if (!requestId) {
      console.error('❌ Request ID required for reset command');
      process.exit(1);
    }
    await testAdminAction('reset_attempts', requestId);
    break;
    
  case 'manual':
    if (!requestId) {
      console.error('❌ Request ID required for manual command');
      process.exit(1);
    }
    await testAdminAction('mark_manual', requestId);
    break;
    
  default:
    console.error(`❌ Unknown command: ${command}`);
    process.exit(1);
}

console.log('');
console.log('✨ Test completed!');
