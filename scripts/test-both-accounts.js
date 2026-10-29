async function testBothAccounts() {
  try {
    const requestId = 'fe50888f-bb04-4230-a88a-b4585fc7faad';
    
    console.log('🔍 Testing both Stripe accounts...');
    console.log('📋 Account 1 (should have $650): acct_1S0FmFBCrjcqavov');
    console.log('📋 Account 2 (should have $2000+): acct_1S0Fm0BQDAObfzKx');
    
    // Test the current API
    console.log('\n1️⃣ Testing current API (acct_1S0FmFBCrjcqavov):');
    const response = await fetch('https://auro-pearl.vercel.app/api/payments/distribute-reviewer-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
    
    const data = await response.json();
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
    if (data.errorType === 'INSUFFICIENT_FUNDS') {
      console.log('\n🔍 Analysis:');
      console.log('   Account being checked: acct_1S0FmFBCrjcqavov');
      console.log('   Balance found: $' + (data.availableBalance / 100).toFixed(2));
      console.log('   Expected balance: $650.00');
      console.log('\n💡 This suggests:');
      console.log('   - Either acct_1S0FmFBCrjcqavov actually has $6.00, not $650.00');
      console.log('   - Or the API is checking the wrong account despite the ID');
      console.log('   - Or there\'s a caching issue with Stripe');
    }
    
    console.log('\n🔍 Next steps:');
    console.log('   1. Check your Stripe dashboard to confirm which account has $650');
    console.log('   2. Verify the account ID matches acct_1S0FmFBCrjcqavov');
    console.log('   3. If the account ID is wrong, update the API code');
    console.log('   4. If the balance is wrong, check for pending transfers or holds');
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

testBothAccounts();
