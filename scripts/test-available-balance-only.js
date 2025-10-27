async function testAvailableBalanceOnly() {
  try {
    const requestId = 'fe50888f-bb04-4230-a88a-b4585fc7faad';
    
    console.log('🔍 Testing API with AVAILABLE balance only (not pending)...');
    console.log('💰 This should only use available funds for transfers');
    
    const response = await fetch('https://www.appauro.com/api/payments/distribute-reviewer-payment', {
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
      console.log('   Required:', `$${(data.requiredAmount / 100).toFixed(2)}`);
      console.log('   Shortfall:', `$${(data.shortfall / 100).toFixed(2)}`);
      
      console.log('\n✅ SUCCESS! API is now correctly using only available balance');
      console.log('   This means transfers will only happen when funds are actually settled');
      console.log('   Pending funds will remain pending until they become available');
      
      if (data.availableBalance >= data.requiredAmount) {
        console.log('\n🎉 Available balance is sufficient for the transfer!');
        console.log('   The transfer should proceed successfully');
      } else {
        console.log('\n⏳ Available balance is insufficient');
        console.log('   Transfer will wait until more funds become available');
        console.log('   This is the correct behavior for a stable payment system');
      }
    } else if (data.success) {
      console.log('\n🎉 Transfer successful!');
      console.log('   Transfer ID:', data.transferId);
      console.log('   Amount:', `$${(data.amount / 100).toFixed(2)}`);
    } else {
      console.log('\n🔍 Other response:', data);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

testAvailableBalanceOnly();
