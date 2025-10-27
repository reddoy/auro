async function testTransferWithoutBalanceCheck() {
  try {
    const requestId = 'fe50888f-bb04-4230-a88a-b4585fc7faad';
    
    console.log('🔍 Testing transfer without balance check...');
    console.log('⚠️  This will attempt to create a transfer regardless of balance');
    
    const response = await fetch('https://www.appauro.com/api/payments/distribute-reviewer-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
    
    const data = await response.json();
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ Transfer successful!');
      console.log('   Transfer ID:', data.transferId);
      console.log('   Amount:', `$${(data.amount / 100).toFixed(2)}`);
      console.log('   Destination:', data.destination);
    } else if (data.error) {
      console.log('\n❌ Transfer failed:');
      console.log('   Error:', data.error);
      if (data.error.includes('insufficient')) {
        console.log('\n💡 This confirms the transfer is failing due to insufficient funds');
        console.log('   The API key is definitely associated with the wrong account');
      } else if (data.error.includes('account')) {
        console.log('\n💡 This suggests an account permission issue');
      } else {
        console.log('\n💡 This suggests a different issue:', data.error);
      }
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

testTransferWithoutBalanceCheck();
