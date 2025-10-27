async function testDebugAPI() {
  try {
    const requestId = 'fe50888f-bb04-4230-a88a-b4585fc7faad';
    
    console.log('🔍 Testing debug API with multiple balance retrieval approaches...');
    
    const response = await fetch('https://www.appauro.com/api/payments/distribute-reviewer-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
    
    const data = await response.json();
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
    if (data.errorType === 'INSUFFICIENT_FUNDS') {
      console.log('\n❌ Still insufficient funds:');
      console.log('   Available:', `$${(data.availableBalance / 100).toFixed(2)}`);
      console.log('   Required:', `$${(data.requiredAmount / 100).toFixed(2)}`);
      console.log('\n💡 This means both approaches are still returning $6.00');
      console.log('   The issue is likely with the Stripe API key or account permissions.');
    } else if (data.error) {
      console.log('\n🔍 Error response:', data.error);
      if (data.details) {
        console.log('   Details:', data.details);
      }
    } else {
      console.log('\n✅ Unexpected success or different response:', data);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

testDebugAPI();
