async function testPendingBalance() {
  try {
    const requestId = 'fe50888f-bb04-4230-a88a-b4585fc7faad';
    
    console.log('🔍 Testing API with pending balance support...');
    console.log('💰 This should now show both available and pending balances');
    
    const response = await fetch('https://auro-pearl.vercel.app/api/payments/distribute-reviewer-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
    
    const data = await response.json();
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
    if (data.errorType === 'INSUFFICIENT_FUNDS') {
      console.log('\n💰 Balance Details:');
      console.log('   Available:', `$${(data.availableBalance / 100).toFixed(2)}`);
      console.log('   Pending:', `$${(data.pendingBalance / 100).toFixed(2)}`);
      console.log('   Total:', `$${(data.totalBalance / 100).toFixed(2)}`);
      console.log('   Required:', `$${(data.requiredAmount / 100).toFixed(2)}`);
      console.log('   Shortfall:', `$${(data.shortfall / 100).toFixed(2)}`);
      
      if (data.totalBalance >= data.requiredAmount) {
        console.log('\n✅ SUCCESS! Total balance is sufficient for the transfer');
        console.log('   The API should now allow the transfer to proceed');
      } else {
        console.log('\n❌ Still insufficient funds even with pending balance');
        console.log('   You may need to wait for settlement or add more funds');
      }
    } else if (data.success) {
      console.log('\n🎉 Transfer successful!');
    } else {
      console.log('\n🔍 Other response:', data);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

testPendingBalance();
