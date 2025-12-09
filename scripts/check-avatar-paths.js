const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Hardcoded from app.json
const supabaseUrl = 'https://zxazjbduiistnfstnwka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YXpqYmR1aWlzdG5mc3Rud2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTY0NDYsImV4cCI6MjA3MTMzMjQ0Nn0.apdP9iKtqvt8os_pdq8dgojMHSPUk5HsIVLjzw1gevA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvatarPaths() {
  console.log('🔍 Checking avatar paths in database...\n');
  
  // Get reviewers with avatar URLs
  const { data: reviewers, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url')
    .eq('is_reviewer', 'approved')
    .not('avatar_url', 'is', null)
    .limit(20);
  
  if (error) {
    console.error('❌ Error fetching reviewers:', error);
    return;
  }
  
  if (!reviewers || reviewers.length === 0) {
    console.log('⚠️  No reviewers with avatar URLs found');
    return;
  }
  
  console.log(`✅ Found ${reviewers.length} reviewers with avatar URLs\n`);
  
  const bucket = 'avatars';
  let foundCount = 0;
  let missingCount = 0;
  
  for (const reviewer of reviewers) {
    const avatarPath = reviewer.avatar_url;
    const displayName = `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() || reviewer.username;
    
    console.log(`\n👤 ${displayName} (${reviewer.username})`);
    console.log(`   Path: ${avatarPath}`);
    
    // Try to get signed URL for this path
    try {
      const { data: signedData, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(avatarPath, 60);
      
      if (signError) {
        console.log(`   ❌ Cannot sign URL: ${signError.message}`);
        missingCount++;
        
        // If it's a directory, try listing it
        if (avatarPath.endsWith('/')) {
          const { data: files, error: listError } = await supabase.storage
            .from(bucket)
            .list(avatarPath, { limit: 5 });
          
          if (listError) {
            console.log(`   ❌ Cannot list directory: ${listError.message}`);
          } else if (files && files.length > 0) {
            console.log(`   ⚠️  Directory has ${files.length} file(s), but signing failed`);
            files.forEach(f => console.log(`      - ${f.name}`));
          } else {
            console.log(`   ⚠️  Directory is empty`);
          }
        }
      } else if (signedData?.signedUrl) {
        console.log(`   ✅ File exists! Signed URL generated`);
        foundCount++;
      } else {
        console.log(`   ⚠️  No signed URL returned`);
        missingCount++;
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
      missingCount++;
    }
  }
  
  console.log(`\n\n📊 Summary:`);
  console.log(`   ✅ Found: ${foundCount}`);
  console.log(`   ❌ Missing: ${missingCount}`);
  
  // Check if files might be in users/ directories instead
  console.log(`\n\n🔍 Checking if files exist in users/ directories...`);
  for (const reviewer of reviewers.slice(0, 5)) {
    const userPath = `users/${reviewer.id}/avatar/`;
    try {
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list(userPath, { limit: 5 });
      
      if (!error && files && files.length > 0) {
        console.log(`\n✅ ${reviewer.username}: Found ${files.length} file(s) in ${userPath}`);
        files.forEach(f => console.log(`   - ${f.name}`));
      }
    } catch (err) {
      // Ignore errors
    }
  }
}

checkAvatarPaths().catch(console.error);

