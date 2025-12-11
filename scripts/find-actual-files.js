// This script will help find where the files actually are
// We need to check the actual structure you see in Supabase

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zxazjbduiistnfstnwka.supabase.co';
// Try with anon key first - if policies are fixed, this should work
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YXpqYmR1aWlzdG5mc3Rud2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTY0NDYsImV4cCI6MjA3MTMzMjQ0Nn0.apdP9iKtqvt8os_pdq8dgojMHSPUk5HsIVLjzw1gevA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findFiles() {
  console.log('🔍 Searching for actual files in storage...\n');
  
  // Check temp-uploads root
  console.log('📁 Checking temp-uploads/ root...');
  try {
    const { data: root, error } = await supabase.storage
      .from('avatars')
      .list('temp-uploads', { limit: 50 });
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   ⚠️  This might be a permissions issue - the policy fix may not have been applied yet`);
    } else if (root && root.length > 0) {
      console.log(`   ✅ Found ${root.length} item(s) in temp-uploads/ root:`);
      root.forEach(item => {
        console.log(`      - ${item.name}${item.id ? ' (file)' : ' (folder)'}`);
      });
      
      // For each folder, check what's inside
      for (const item of root.slice(0, 5)) {
        if (!item.id) {
          console.log(`\n   📂 Checking folder: temp-uploads/${item.name}/`);
          try {
            const { data: subItems, error: subError } = await supabase.storage
              .from('avatars')
              .list(`temp-uploads/${item.name}`, { limit: 20 });
            
            if (subError) {
              console.log(`      ❌ Error: ${subError.message}`);
            } else if (subItems && subItems.length > 0) {
              console.log(`      ✅ Found ${subItems.length} item(s):`);
              subItems.forEach(sub => {
                console.log(`         - ${sub.name}${sub.id ? ' (file)' : ' (folder)'}`);
                
                // If it's an avatar folder, check inside
                if (!sub.id && (sub.name === 'avatar' || sub.name === 'selfie')) {
                  console.log(`\n         📂 Checking: temp-uploads/${item.name}/${sub.name}/`);
                  (async () => {
                    const { data: avatarFiles } = await supabase.storage
                      .from('avatars')
                      .list(`temp-uploads/${item.name}/${sub.name}`, { limit: 10 });
                    
                    if (avatarFiles && avatarFiles.length > 0) {
                      console.log(`            ✅ Found ${avatarFiles.length} file(s):`);
                      avatarFiles.forEach(f => {
                        console.log(`               - ${f.name}`);
                      });
                    }
                  })();
                }
              });
            } else {
              console.log(`      ⚠️  Folder is empty`);
            }
          } catch (err) {
            console.log(`      ❌ Exception: ${err.message}`);
          }
        }
      }
    } else {
      console.log(`   ⚠️  temp-uploads/ is empty or not accessible`);
      console.log(`   💡 If you can see files in Supabase dashboard, they might be in a different bucket or location`);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
  
  // Also check if there are any files directly in the root
  console.log(`\n📁 Checking avatars bucket root...`);
  try {
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 20 });
    
    if (rootError) {
      console.log(`   ❌ Error: ${rootError.message}`);
    } else if (rootFiles && rootFiles.length > 0) {
      console.log(`   ✅ Found ${rootFiles.length} item(s) in root:`);
      rootFiles.forEach(item => {
        console.log(`      - ${item.name}${item.id ? ' (file)' : ' (folder)'}`);
      });
    } else {
      console.log(`   ⚠️  Root is empty`);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
}

findFiles().catch(console.error);

