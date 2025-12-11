const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zxazjbduiistnfstnwka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YXpqYmR1aWlzdG5mc3Rud2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTY0NDYsImV4cCI6MjA3MTMzMjQ0Nn0.apdP9iKtqvt8os_pdq8dgojMHSPUk5HsIVLjzw1gevA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllStorage() {
  console.log('🔍 Checking ALL storage buckets and locations...\n');
  
  // Check all buckets
  const buckets = ['avatars', 'request-media'];
  
  for (const bucketName of buckets) {
    console.log(`\n📦 Bucket: ${bucketName}`);
    console.log('='.repeat(50));
    
    // Try to list root
    try {
      const { data: root, error } = await supabase.storage
        .from(bucketName)
        .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      
      if (error) {
        console.log(`   ❌ Cannot list root: ${error.message}`);
      } else if (root && root.length > 0) {
        console.log(`   ✅ Found ${root.length} item(s) in root:`);
        root.slice(0, 10).forEach(item => {
          const type = item.id ? '📁 folder' : '📄 file';
          const size = item.metadata?.size ? ` (${(item.metadata.size / 1024).toFixed(1)} KB)` : '';
          console.log(`      ${type}: ${item.name}${size}`);
        });
        if (root.length > 10) {
          console.log(`      ... and ${root.length - 10} more`);
        }
      } else {
        console.log(`   ⚠️  Root is empty`);
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
    }
    
    // Check temp-uploads recursively
    console.log(`\n   🔍 Checking temp-uploads/...`);
    try {
      const { data: tempUploads, error } = await supabase.storage
        .from(bucketName)
        .list('temp-uploads', { limit: 50 });
      
      if (error) {
        console.log(`      ❌ Error: ${error.message}`);
      } else if (tempUploads && tempUploads.length > 0) {
        console.log(`      ✅ Found ${tempUploads.length} item(s) in temp-uploads:`);
        tempUploads.slice(0, 10).forEach(item => {
          console.log(`         - ${item.name}${item.id ? ' (folder)' : ' (file)'}`);
        });
        if (tempUploads.length > 10) {
          console.log(`         ... and ${tempUploads.length - 10} more`);
        }
      } else {
        console.log(`      ⚠️  temp-uploads is empty or doesn't exist`);
      }
    } catch (err) {
      console.log(`      ❌ Exception: ${err.message}`);
    }
    
    // Check users/ directory
    console.log(`\n   🔍 Checking users/...`);
    try {
      const { data: users, error } = await supabase.storage
        .from(bucketName)
        .list('users', { limit: 20 });
      
      if (error) {
        console.log(`      ❌ Error: ${error.message}`);
      } else if (users && users.length > 0) {
        console.log(`      ✅ Found ${users.length} user directory(ies):`);
        users.slice(0, 5).forEach(user => {
          console.log(`         - ${user.name}/`);
        });
        if (users.length > 5) {
          console.log(`         ... and ${users.length - 5} more`);
        }
      } else {
        console.log(`      ⚠️  users/ is empty or doesn't exist`);
      }
    } catch (err) {
      console.log(`      ❌ Exception: ${err.message}`);
    }
  }
  
  // Check specific paths from database
  console.log(`\n\n🔍 Checking specific paths from database...`);
  const { data: reviewers } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('is_reviewer', 'approved')
    .not('avatar_url', 'is', null)
    .limit(5);
  
  if (reviewers) {
    for (const reviewer of reviewers) {
      const path = reviewer.avatar_url;
      console.log(`\n   👤 ${reviewer.username}: ${path}`);
      
      // Try the exact path
      try {
        const { data: signed, error } = await supabase.storage
          .from('avatars')
          .createSignedUrl(path, 60);
        
        if (error) {
          console.log(`      ❌ Cannot access: ${error.message}`);
          
          // If it's a directory path, try listing
          if (path.endsWith('/')) {
            const { data: files, error: listErr } = await supabase.storage
              .from('avatars')
              .list(path, { limit: 5 });
            
            if (!listErr && files && files.length > 0) {
              console.log(`      ⚠️  Directory exists with ${files.length} file(s):`);
              files.forEach(f => console.log(`         - ${f.name}`));
            }
          }
        } else {
          console.log(`      ✅ File exists and can be signed!`);
        }
      } catch (err) {
        console.log(`      ❌ Exception: ${err.message}`);
      }
    }
  }
}

checkAllStorage().catch(console.error);

