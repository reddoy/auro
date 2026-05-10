const path = require('path');
const { createRequire } = require('module');
const Stripe = createRequire(path.join(__dirname, '..', 'site', 'package.json'))('stripe');

async function checkAccountStatus(stripe, accountId) {
  try {
    console.log(`🔍 Checking Stripe Connect account: ${accountId}`);
    
    // Retrieve the account details
    const account = await stripe.accounts.retrieve(accountId);
    
    console.log('📊 Account Details:');
    console.log('==================');
    console.log(`Account ID: ${account.id}`);
    console.log(`Type: ${account.type}`);
    console.log(`Country: ${account.country}`);
    console.log(`Default Currency: ${account.default_currency}`);
    console.log(`Email: ${account.email}`);
    console.log(`Business Type: ${account.business_type}`);
    console.log(`Charges Enabled: ${account.charges_enabled}`);
    console.log(`Payouts Enabled: ${account.payouts_enabled}`);
    console.log(`Details Submitted: ${account.details_submitted}`);
    console.log(`Requirements:`, account.requirements);
    
    // Check capabilities
    console.log('\n🔧 Capabilities:');
    console.log('================');
    if (account.capabilities) {
      Object.entries(account.capabilities).forEach(([capability, status]) => {
        console.log(`${capability}: ${status}`);
      });
    }
    
    // Check requirements
    console.log('\n📋 Requirements:');
    console.log('================');
    if (account.requirements) {
      console.log('Currently Due:', account.requirements.currently_due || []);
      console.log('Eventually Due:', account.requirements.eventually_due || []);
      console.log('Past Due:', account.requirements.past_due || []);
      console.log('Pending Verification:', account.requirements.pending_verification || []);
      console.log('Disabled Reason:', account.requirements.disabled_reason || 'None');
    }
    
    // Check if account is restricted
    if (account.requirements?.disabled_reason) {
      console.log('\n⚠️  ACCOUNT ISSUES:');
      console.log('==================');
      console.log(`Disabled Reason: ${account.requirements.disabled_reason}`);
      console.log('This account cannot process payments until the issues are resolved.');
    }
    
    // Check account status
    console.log('\n✅ Account Status Summary:');
    console.log('==========================');
    console.log(`Can Charge: ${account.charges_enabled ? '✅ Yes' : '❌ No'}`);
    console.log(`Can Receive Payouts: ${account.payouts_enabled ? '✅ Yes' : '❌ No'}`);
    console.log(`Details Complete: ${account.details_submitted ? '✅ Yes' : '❌ No'}`);
    
    if (!account.charges_enabled || !account.payouts_enabled || !account.details_submitted) {
      console.log('\n🚨 ACTION REQUIRED:');
      console.log('==================');
      console.log('This account needs attention. The reviewer should:');
      console.log('1. Complete their Stripe Connect onboarding');
      console.log('2. Provide any missing required information');
      console.log('3. Verify their identity if required');
      console.log('4. Check their Stripe Dashboard for specific requirements');
    }
    
    return account;
    
  } catch (error) {
    console.error('❌ Error checking account:', error.message);
    
    if (error.code === 'resource_missing') {
      console.log('🔍 This account does not exist or has been deleted.');
    } else if (error.code === 'account_invalid') {
      console.log('🔍 This account is invalid or restricted.');
    }
    
    throw error;
  }
}

// Main execution
async function main() {
  const accountId = process.argv[2];
  
  if (!accountId) {
    console.log('Usage: node check-stripe-account-status.js <account_id>');
    console.log('Example: node check-stripe-account-status.js acct_1SIh6wAyaNDVJK2m');
    process.exit(1);
  }
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY environment variable is required');
    process.exit(1);
  }
  
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    await checkAccountStatus(stripe, accountId);
  } catch (error) {
    console.error('Failed to check account status:', error.message);
    process.exit(1);
  }
}

main();
