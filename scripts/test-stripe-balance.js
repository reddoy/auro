const Stripe = require('stripe');

async function testStripeBalance() {
  try {
    // Load environment variables
    require('dotenv').config({ path: '../site/.env.local' });
    
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      console.error('❌ Missing STRIPE_SECRET_KEY');
      return;
    }
    
    const stripe = new Stripe(secret);
    const auroAccountId = 'acct_1S0FmFBCrjcqavov';
    
    console.log('🔍 Testing Stripe balance retrieval...');
    console.log('📋 Account ID:', auroAccountId);
    console.log('🔑 Using secret key:', secret.substring(0, 10) + '...');
    
    // Test 1: Get default account balance
    console.log('\n1️⃣ Testing DEFAULT account balance:');
    try {
      const defaultBalance = await stripe.balance.retrieve();
      console.log('✅ Default balance retrieved successfully');
      console.log('💰 Available:', defaultBalance.available.map(b => `${b.amount/100} ${b.currency}`).join(', '));
      console.log('💳 Pending:', defaultBalance.pending.map(b => `${b.amount/100} ${b.currency}`).join(', '));
    } catch (error) {
      console.error('❌ Default balance error:', error.message);
    }
    
    // Test 2: Get Auro account balance
    console.log('\n2️⃣ Testing AURO account balance:');
    try {
      const auroBalance = await stripe.balance.retrieve({}, { stripeAccount: auroAccountId });
      console.log('✅ Auro balance retrieved successfully');
      console.log('💰 Available:', auroBalance.available.map(b => `${b.amount/100} ${b.currency}`).join(', '));
      console.log('💳 Pending:', auroBalance.pending.map(b => `${b.amount/100} ${b.currency}`).join(', '));
    } catch (error) {
      console.error('❌ Auro balance error:', error.message);
      console.error('🔍 Error details:', error);
    }
    
    // Test 3: List all accounts
    console.log('\n3️⃣ Testing account listing:');
    try {
      const accounts = await stripe.accounts.list({ limit: 10 });
      console.log('✅ Accounts retrieved successfully');
      console.log('📋 Found', accounts.data.length, 'accounts:');
      accounts.data.forEach(account => {
        console.log(`   - ${account.id}: ${account.business_profile?.name || 'No name'} (${account.type})`);
      });
    } catch (error) {
      console.error('❌ Account listing error:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

testStripeBalance();
