async function testUpdatedAPI() {
  try {
    const requestId = 'fe50888f-bb04-4230-a88a-b4585fc7faad';
    
    console.log('🔍 Testing updated API with account acct_1S0Fm0BQDAObfzKx...');
    
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
      console.log('\n💡 This means the API is still not checking the right account.');
    } else if (data.success) {
      console.log('\n✅ Payment distribution successful!');
    } else {
      console.log('\n🔍 Other response:', data);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

testUpdatedAPI();
