#!/usr/bin/env node

/**
 * Test with a real UUID format to see if that helps
 */

const BASE_URL = 'https://www.appauro.com';

async function testWithRealUuid() {
  console.log('🧪 Testing with real UUID format...');
  
  // Generate a realistic UUID format
  const testUuid = '123e4567-e89b-12d3-a456-426614174000';
  
  try {
    const response = await fetch(`${BASE_URL}/api/payments/distribute-reviewer-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId: testUuid })
    });

    console.log(`📡 Response status: ${response.status}`);
    console.log(`📡 Response ok: ${response.ok}`);
    
    const data = await response.json();
    console.log('📊 Response data:', JSON.stringify(data, null, 2));
    
    if (response.status === 404) {
      console.log('✅ Request not found (expected for test UUID)');
    } else if (response.status === 400) {
      console.log('✅ Request not found or other validation error (expected)');
    } else if (response.status === 500) {
      console.log('❌ Server error - likely database connection issue');
      console.log('💡 Check if SUPABASE_SERVICE_ROLE_KEY is set in production');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testWithRealUuid();
