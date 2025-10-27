async function testPaymentAPI() {
  try {
    const requestId = 'fe50888f-bb04-4230-a88a-b4585fc7faad'; // From your logs
    
    console.log('🔍 Testing payment distribution API...');
    console.log('📋 Request ID:', requestId);
    
    const response = await fetch('https://www.appauro.com/api/payments/distribute-reviewer-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
    
    console.log('📊 Response status:', response.status);
    console.log('✅ Response ok:', response.ok);
    
    const data = await response.json();
    console.log('📄 Response data:', JSON.stringify(data, null, 2));
    
    if (data.errorType === 'INSUFFICIENT_FUNDS') {
      console.log('\n💰 Balance Details:');
      console.log('   Available:', `$${(data.availableBalance / 100).toFixed(2)}`);
      console.log('   Required:', `$${(data.requiredAmount / 100).toFixed(2)}`);
      console.log('   Shortfall:', `$${(data.shortfall / 100).toFixed(2)}`);
      
      console.log('\n🔍 This suggests the API is checking the wrong Stripe account.');
      console.log('   Expected: $490.00 (your Auro account)');
      console.log('   Actual: $6.00 (some other account)');
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

testPaymentAPI();
