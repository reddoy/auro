#!/usr/bin/env node

/**
 * Quick test to check if the payment distribution API is accessible
 */

const BASE_URL = 'https://auro-pearl.vercel.app';

async function testApiEndpoint() {
  console.log('🧪 Testing payment distribution API endpoint...');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  try {
    // Test if the endpoint exists
    const response = await fetch(`${BASE_URL}/api/payments/distribute-reviewer-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId: 'test-request-id' })
    });

    console.log(`📡 Response status: ${response.status}`);
    console.log(`📡 Response ok: ${response.ok}`);
    
    const data = await response.json();
    console.log('📊 Response data:', data);
    
    if (response.status === 404) {
      console.log('❌ API endpoint not found - check if it\'s deployed');
    } else if (response.status === 400) {
      console.log('✅ API endpoint exists (400 is expected for invalid request ID)');
    } else {
      console.log('📋 Unexpected response:', response.status);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('💡 This might be a network connectivity issue');
    } else if (error.message.includes('CORS')) {
      console.log('💡 This might be a CORS issue');
    }
  }
}

testApiEndpoint();
