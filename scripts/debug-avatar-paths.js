const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zxazjbduiistnfstnwka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YXpqYmR1aWlzdG5mc3Rud2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTY0NDYsImV4cCI6MjA3MTMzMjQ0Nn0.apdP9iKtqvt8os_pdq8dgojMHSPUk5HsIVLjzw1gevA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAvatarPaths() {
  console.log('🔍 Debugging avatar paths...\n');
  
  // Get reviewers with avatar_url
  const { data: reviewers, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, is_reviewer')
    .eq('is_reviewer', 'approved')
    .not('avatar_url', 'is', null)
    .limit(10);
  
  if (error) {
    console.error('❌ Error fetching reviewers:', error);
    return;
  }
  
  console.log(`Found ${reviewers.length} reviewers with avatar_url\n`);
  
  for (const reviewer of reviewers) {
    const avatarPath = reviewer.avatar_url;
    const name = `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() || reviewer.username;
    
    console.log(`\n👤 ${name} (${reviewer.username})`);
    console.log(`   Database path: ${avatarPath}`);
    
    // Try to list the directory if it's a directory path
    if (avatarPath.endsWith('/')) {
      console.log(`   ⚠️  Path ends with / (directory)`);
      try {
        const { data: files, error: listError } = await supabase.storage
          .from('avatars')
          .list(avatarPath, { limit: 5 });
        
        if (listError) {
          console.log(`   ❌ Cannot list directory: ${listError.message}`);
        } else if (files && files.length > 0) {
          console.log(`   ✅ Directory exists with ${files.length} file(s):`);
          files.forEach(f => {
            console.log(`      - ${f.name} (${f.id ? 'file' : 'folder'})`);
          });
        } else {
          console.log(`   ⚠️  Directory is empty or doesn't exist`);
        }
      } catch (err) {
        console.log(`   ❌ Exception listing: ${err.message}`);
      }
    } else {
      // Try to sign the exact path
      try {
        const { data: signed, error: signError } = await supabase.storage
          .from('avatars')
          .createSignedUrl(avatarPath, 60);
        
        if (signError) {
          console.log(`   ❌ Cannot sign URL: ${signError.message}`);
          
          // Try checking if it's actually a directory
          const dirPath = avatarPath + '/';
          const { data: dirFiles } = await supabase.storage
            .from('avatars')
            .list(dirPath, { limit: 1 });
          
          if (dirFiles && dirFiles.length > 0) {
            console.log(`   ⚠️  Path might be a directory - found files in ${dirPath}`);
          }
        } else {
          console.log(`   ✅ Can sign URL successfully`);
          console.log(`   📎 Signed URL: ${signed.signedUrl.substring(0, 100)}...`);
          
          // Try to fetch the signed URL to see if it actually works
          try {
            const response = await fetch(signed.signedUrl, { method: 'HEAD' });
            if (response.ok) {
              console.log(`   ✅ Signed URL is accessible (${response.status})`);
            } else {
              console.log(`   ❌ Signed URL returns ${response.status} ${response.statusText}`);
            }
          } catch (fetchErr) {
            console.log(`   ❌ Cannot fetch signed URL: ${fetchErr.message}`);
          }
        }
      } catch (err) {
        console.log(`   ❌ Exception signing: ${err.message}`);
      }
    }
  }
  
  // Also check what files actually exist in storage
  console.log(`\n\n📦 Checking what files actually exist in storage...`);
  console.log(`   Checking temp-uploads/...`);
  
  try {
    const { data: tempUploads, error: tempError } = await supabase.storage
      .from('avatars')
      .list('temp-uploads', { limit: 20 });
    
    if (tempError) {
      console.log(`   ❌ Cannot list temp-uploads: ${tempError.message}`);
    } else if (tempUploads && tempUploads.length > 0) {
      console.log(`   ✅ Found ${tempUploads.length} item(s) in temp-uploads:`);
      tempUploads.slice(0, 10).forEach(item => {
        console.log(`      - ${item.name}${item.id ? ' (file)' : ' (folder)'}`);
      });
    } else {
      console.log(`   ⚠️  temp-uploads is empty`);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
  
  console.log(`\n   Checking users/...`);
  try {
    const { data: users, error: usersError } = await supabase.storage
      .from('avatars')
      .list('users', { limit: 20 });
    
    if (usersError) {
      console.log(`   ❌ Cannot list users: ${usersError.message}`);
    } else if (users && users.length > 0) {
      console.log(`   ✅ Found ${users.length} user directory(ies):`);
      users.slice(0, 10).forEach(user => {
        console.log(`      - ${user.name}/`);
      });
    } else {
      console.log(`   ⚠️  users/ is empty`);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
}

debugAvatarPaths().catch(console.error);

