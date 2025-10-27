const Stripe = require('stripe');

async function testAccountBalance() {
  try {
    // You'll need to set your Stripe secret key here
    const stripe = new Stripe('sk_test_...'); // Replace with your actual secret key
    
    const auroAccountId = 'acct_1S0FmFBCrjcqavov';
    
    console.log('🔍 Testing account:', auroAccountId);
    
    // Test 1: Check if account exists
    try {
      const account = await stripe.accounts.retrieve(auroAccountId);
      console.log('✅ Account found:', {
        id: account.id,
        type: account.type,
        business_profile: account.business_profile?.name,
        country: account.country
      });
    } catch (error) {
      console.error('❌ Account error:', error.message);
      return;
    }
    
    // Test 2: Get balance
    try {
      const balance = await stripe.balance.retrieve({}, { stripeAccount: auroAccountId });
      console.log('💰 Balance:', {
        available: balance.available.map(b => `${b.amount/100} ${b.currency}`),
        pending: balance.pending.map(b => `${b.amount/100} ${b.currency}`)
      });
    } catch (error) {
      console.error('❌ Balance error:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

console.log('⚠️  Please update the Stripe secret key in this script before running');
console.log('   Replace "sk_test_..." with your actual secret key');
console.log('   You can find it in your Stripe dashboard under Developers > API keys');
testAccountBalance();
