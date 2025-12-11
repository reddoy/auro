// Check the actual structure of files in storage
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zxazjbduiistnfstnwka.supabase.co';
// Using anon key - if this doesn't work, we'll need service role
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YXpqYmR1aWlzdG5mc3Rud2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTY0NDYsImV4cCI6MjA3MTMzMjQ0Nn0.apdP9iKtqvt8os_pdq8dgojMHSPUk5HsIVLjzw1gevA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStructure() {
  console.log('🔍 Checking actual file structure in avatars bucket...\n');
  
  // Check temp-uploads structure
  console.log('📁 Checking temp-uploads/...');
  try {
    const { data: tempRoot, error } = await supabase.storage
      .from('avatars')
      .list('temp-uploads', { limit: 50 });
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else if (tempRoot && tempRoot.length > 0) {
      console.log(`   ✅ Found ${tempRoot.length} item(s) in temp-uploads/`);
      tempRoot.slice(0, 10).forEach(item => {
        console.log(`      - ${item.name}${item.id ? ' (file)' : ' (folder)'}`);
        
        // If it's a folder, check what's inside
        if (!item.id) {
          (async () => {
            const { data: subItems } = await supabase.storage
              .from('avatars')
              .list(`temp-uploads/${item.name}`, { limit: 10 });
            if (subItems && subItems.length > 0) {
              console.log(`         Contains ${subItems.length} item(s):`);
              subItems.slice(0, 5).forEach(sub => {
                console.log(`            - ${sub.name}${sub.id ? ' (file)' : ' (folder)'}`);
              });
            }
          })();
        }
      });
    } else {
      console.log(`   ⚠️  temp-uploads/ is empty or not accessible`);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
  
  // Check if users/ exists at all
  console.log('\n📁 Checking users/...');
  try {
    const { data: users, error } = await supabase.storage
      .from('avatars')
      .list('users', { limit: 5 });
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else if (users && users.length > 0) {
      console.log(`   ✅ Found ${users.length} item(s) in users/`);
      users.slice(0, 5).forEach(item => {
        console.log(`      - ${item.name}${item.id ? ' (file)' : ' (folder)'}`);
      });
    } else {
      console.log(`   ⚠️  users/ doesn't exist or is empty`);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
  
  // Check root
  console.log('\n📁 Checking root of avatars bucket...');
  try {
    const { data: root, error } = await supabase.storage
      .from('avatars')
      .list('', { limit: 20 });
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else if (root && root.length > 0) {
      console.log(`   ✅ Found ${root.length} item(s) in root:`);
      root.slice(0, 10).forEach(item => {
        console.log(`      - ${item.name}${item.id ? ' (file)' : ' (folder)'}`);
      });
    } else {
      console.log(`   ⚠️  Root is empty`);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
}

checkStructure().catch(console.error);

