// This script will help us verify if the database paths match actual file locations
// Run this AFTER applying the storage policies migration

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zxazjbduiistnfstnwka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YXpqYmR1aWlzdG5mc3Rud2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTY0NDYsImV4cCI6MjA3MTMzMjQ0Nn0.apdP9iKtqvt8os_pdq8dgojMHSPUk5HsIVLjzw1gevA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPaths() {
  console.log('🔍 Verifying file paths after policy fix...\n');
  
  // Get a few reviewers
  const { data: reviewers } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url')
    .eq('is_reviewer', 'approved')
    .not('avatar_url', 'is', null)
    .limit(3);
  
  if (!reviewers || reviewers.length === 0) {
    console.log('No reviewers found');
    return;
  }
  
  for (const reviewer of reviewers) {
    const dbPath = reviewer.avatar_url;
    const name = `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() || reviewer.username;
    
    console.log(`\n👤 ${name}`);
    console.log(`   Database path: ${dbPath}`);
    
    // Try to sign the exact path from database
    try {
      const { data: signed, error: signError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(dbPath, 60);
      
      if (signError) {
        console.log(`   ❌ Cannot sign: ${signError.message}`);
        
        // Try to find the actual file by exploring the directory structure
        const pathParts = dbPath.split('/');
        if (pathParts.length >= 3) {
          const baseDir = pathParts.slice(0, -1).join('/') + '/';
          const fileName = pathParts[pathParts.length - 1];
          
          console.log(`   🔍 Checking directory: ${baseDir}`);
          console.log(`   🔍 Looking for file: ${fileName}`);
          
          const { data: files, error: listError } = await supabase.storage
            .from('avatars')
            .list(baseDir, { limit: 20 });
          
          if (listError) {
            console.log(`   ❌ Cannot list directory: ${listError.message}`);
          } else if (files && files.length > 0) {
            console.log(`   ✅ Found ${files.length} file(s) in directory:`);
            files.forEach(f => {
              const match = f.name === fileName ? ' ✅ MATCHES DB PATH' : '';
              console.log(`      - ${f.name}${match}`);
            });
            
            // Try signing the first file we find
            if (files[0] && files[0].name) {
              const actualPath = baseDir + files[0].name;
              console.log(`   🔍 Trying to sign actual file: ${actualPath}`);
              const { data: actualSigned, error: actualError } = await supabase.storage
                .from('avatars')
                .createSignedUrl(actualPath, 60);
              
              if (actualError) {
                console.log(`   ❌ Cannot sign actual file: ${actualError.message}`);
              } else {
                console.log(`   ✅ Can sign actual file!`);
                console.log(`   📎 URL: ${actualSigned.signedUrl.substring(0, 100)}...`);
                
                // Test if the URL actually works
                try {
                  const response = await fetch(actualSigned.signedUrl, { method: 'HEAD' });
                  if (response.ok) {
                    console.log(`   ✅ URL is accessible (${response.status})`);
                  } else {
                    console.log(`   ❌ URL returns ${response.status}`);
                  }
                } catch (fetchErr) {
                  console.log(`   ❌ Cannot fetch URL: ${fetchErr.message}`);
                }
              }
            }
          } else {
            console.log(`   ⚠️  Directory is empty`);
          }
        }
      } else {
        console.log(`   ✅ Can sign database path!`);
        console.log(`   📎 URL: ${signed.signedUrl.substring(0, 100)}...`);
        
        // Test if it works
        try {
          const response = await fetch(signed.signedUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log(`   ✅ URL is accessible (${response.status})`);
          } else {
            console.log(`   ❌ URL returns ${response.status} ${response.statusText}`);
          }
        } catch (fetchErr) {
          console.log(`   ❌ Cannot fetch URL: ${fetchErr.message}`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
    }
  }
}

verifyPaths().catch(console.error);

