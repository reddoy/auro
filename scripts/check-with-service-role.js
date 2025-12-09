// This script uses service role to check if files actually exist
// You'll need to set SUPABASE_SERVICE_ROLE_KEY environment variable
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zxazjbduiistnfstnwka.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set. Please set it as an environment variable.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkWithServiceRole() {
  console.log('🔍 Checking with SERVICE ROLE key...\n');
  
  // Get reviewers with avatar_url
  const { data: reviewers } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, is_reviewer')
    .eq('is_reviewer', 'approved')
    .not('avatar_url', 'is', null)
    .limit(5);
  
  console.log(`Checking ${reviewers.length} reviewers...\n`);
  
  for (const reviewer of reviewers) {
    const avatarPath = reviewer.avatar_url;
    const name = `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() || reviewer.username;
    
    console.log(`👤 ${name}: ${avatarPath}`);
    
    // Try to sign with service role
    try {
      const { data: signed, error: signError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(avatarPath, 60);
      
      if (signError) {
        console.log(`   ❌ Cannot sign: ${signError.message}`);
        
        // Try listing the directory
        const dirPath = avatarPath.substring(0, avatarPath.lastIndexOf('/') + 1);
        const fileName = avatarPath.substring(avatarPath.lastIndexOf('/') + 1);
        console.log(`   🔍 Trying directory: ${dirPath}`);
        
        const { data: files, error: listError } = await supabase.storage
          .from('avatars')
          .list(dirPath, { limit: 10 });
        
        if (listError) {
          console.log(`   ❌ Cannot list directory: ${listError.message}`);
        } else if (files && files.length > 0) {
          console.log(`   ✅ Directory exists with ${files.length} file(s):`);
          files.forEach(f => {
            const match = f.name === fileName ? ' ✅ MATCH' : '';
            console.log(`      - ${f.name}${match}`);
          });
        } else {
          console.log(`   ⚠️  Directory is empty`);
        }
      } else {
        console.log(`   ✅ Can sign URL with service role!`);
        console.log(`   📎 URL: ${signed.signedUrl.substring(0, 100)}...`);
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
    }
  }
  
  // Check what's actually in storage
  console.log(`\n📦 Listing temp-uploads with service role...`);
  try {
    const { data: items, error } = await supabase.storage
      .from('avatars')
      .list('temp-uploads', { limit: 50 });
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else if (items && items.length > 0) {
      console.log(`   ✅ Found ${items.length} item(s):`);
      items.slice(0, 10).forEach(item => {
        console.log(`      - ${item.name}${item.id ? ' (file)' : ' (folder)'}`);
      });
    } else {
      console.log(`   ⚠️  temp-uploads is empty`);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
}

checkWithServiceRole().catch(console.error);

