async function testDefaultBalance() {
  try {
    const requestId = 'fe50888f-bb04-4230-a88a-b4585fc7faad';
    
    console.log('🔍 Testing default Stripe account balance...');
    
    // Test the API endpoint to see what account it's checking
    const response = await fetch('https://www.appauro.com/api/payments/distribute-reviewer-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
    
    const data = await response.json();
    console.log('📄 API Response:', JSON.stringify(data, null, 2));
    
    if (data.errorType === 'INSUFFICIENT_FUNDS') {
      console.log('\n🔍 Analysis:');
      console.log('   The API is checking account:', 'acct_1S0FmFBCrjcqavov');
      console.log('   But finding balance:', `$${(data.availableBalance / 100).toFixed(2)}`);
      console.log('   Expected balance:', '$490.00');
      console.log('\n💡 Possible causes:');
      console.log('   1. The API key is associated with a different account');
      console.log('   2. The account ID is incorrect');
      console.log('   3. The balance check is not working as expected');
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

testDefaultBalance();
