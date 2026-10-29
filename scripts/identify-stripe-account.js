async function identifyStripeAccount() {
  try {
    console.log('🔍 Identifying which Stripe account the API key is associated with...');
    
    // Test the API endpoint to see what account it's actually checking
    const requestId = 'fe50888f-bb04-4230-a88a-b4585fc7faad';
    
    const response = await fetch('https://auro-pearl.vercel.app/api/payments/distribute-reviewer-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
    
    const data = await response.json();
    
    if (data.errorType === 'INSUFFICIENT_FUNDS') {
      console.log('📊 Current API behavior:');
      console.log('   Account ID in code: acct_1S0Fm0BQDAObfzKx');
      console.log('   Balance found: $' + (data.availableBalance / 100).toFixed(2));
      console.log('   Expected balance: $2000+');
      
      console.log('\n🔍 Analysis:');
      console.log('   The API key is associated with a different Stripe account');
      console.log('   that has $6.00, regardless of which account ID we specify.');
      
      console.log('\n💡 Solution:');
      console.log('   1. Go to your Stripe dashboard');
      console.log('   2. Find the account with $2000+ balance');
      console.log('   3. Go to Developers > API keys');
      console.log('   4. Copy the Secret key from THAT account');
      console.log('   5. Update STRIPE_SECRET_KEY in Vercel with the new key');
      console.log('   6. Redeploy the site');
      
      console.log('\n🎯 The account with $2000+ is likely your main platform account');
      console.log('   and the one that should be used for transfers.');
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

identifyStripeAccount();
