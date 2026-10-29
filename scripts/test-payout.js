#!/usr/bin/env node

/**
 * Test script for the payout distribution system
 * This script helps verify that the payment distribution is working correctly
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://auro-pearl.vercel.app';

async function testPayoutDistribution(requestId) {
  console.log(`🧪 Testing payout distribution for request: ${requestId}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/distribute-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        requestId,
        force: false // Don't force, respect completion status
      })
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
      console.log('📊 Details:', data);
    }
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

async function testForcePayoutDistribution(requestId) {
  console.log(`🧪 Testing FORCED payout distribution for request: ${requestId}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/distribute-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        requestId,
        force: true // Force distribution even if not completed
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ FORCED Payment distribution successful!');
      console.log('📊 Results:', {
        transferId: data.transferId,
        reviewerAmount: `$${(data.reviewerAmount / 100).toFixed(2)}`,
        auroFee: `$${(data.auroFee / 100).toFixed(2)}`,
        totalAmount: `$${(data.totalAmount / 100).toFixed(2)}`,
        reviewerName: data.reviewerName
      });
    } else {
      console.log('❌ FORCED Payment distribution failed:');
      console.log('📋 Error:', data.error);
      console.log('📊 Details:', data);
    }
  } catch (error) {
    console.error('💥 FORCED Test failed with error:', error.message);
  }
}

// Get request ID from command line arguments
const requestId = process.argv[2];

if (!requestId) {
  console.log('Usage: node test-payout.js <request-id>');
  console.log('Example: node test-payout.js 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

console.log('🚀 Starting payout distribution tests...');
console.log(`🌐 Base URL: ${BASE_URL}`);
console.log(`📝 Request ID: ${requestId}`);
console.log('');

// Test normal distribution
testPayoutDistribution(requestId).then(() => {
  console.log('');
  console.log('🔄 Testing forced distribution...');
  return testForcePayoutDistribution(requestId);
}).then(() => {
  console.log('');
  console.log('✨ Tests completed!');
}).catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
