#!/usr/bin/env node

/**
 * Verify that avatar files actually exist at the paths stored in the database
 * This will help us understand why signed URLs return 400 errors
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

if (!supabaseUrl) {
  console.error(
    '❌ Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in the environment.'
  );
  process.exit(1);
}

// Use service role for full access
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('   Set it in your terminal: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyFile(path, bucket = 'avatars') {
  try {
    // Try to list the file (this checks if it exists)
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        limit: 100,
        search: path.split('/').pop()
      });
    
    if (listError) {
      return { exists: false, error: listError.message };
    }
    
    const fileName = path.split('/').pop();
    const found = files?.find(f => f.name === fileName);
    
    if (found) {
      // Try to create a signed URL
      const { data: signed, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);
      
      if (signError) {
        return { exists: true, canSign: false, signError: signError.message };
      }
      
      // Try to actually fetch the URL
      try {
        const response = await fetch(signed.signedUrl);
        return {
          exists: true,
          canSign: true,
          canFetch: response.ok,
          status: response.status,
          signedUrl: signed.signedUrl.substring(0, 100) + '...'
        };
      } catch (fetchError) {
        return {
          exists: true,
          canSign: true,
          canFetch: false,
          fetchError: fetchError.message
        };
      }
    }
    
    return { exists: false, reason: 'File not found in listing' };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function main() {
  console.log('🔍 Verifying avatar file paths...\n');
  
  // Fetch reviewers with avatar_url
  const { data: reviewers, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .not('avatar_url', 'is', null)
    .limit(20);
  
  if (error) {
    console.error('❌ Error fetching reviewers:', error);
    process.exit(1);
  }
  
  console.log(`Found ${reviewers.length} reviewers with avatar_url\n`);
  
  for (const reviewer of reviewers) {
    const avatarPath = reviewer.avatar_url;
    if (!avatarPath) continue;
    
    console.log(`\n📸 ${reviewer.username || reviewer.id}`);
    console.log(`   Path: ${avatarPath}`);
    
    const result = await verifyFile(avatarPath, 'avatars');
    
    if (result.exists && result.canSign && result.canFetch) {
      console.log(`   ✅ File exists, can sign, and can fetch (status: ${result.status})`);
    } else if (result.exists && result.canSign) {
      console.log(`   ⚠️  File exists and can sign, but CANNOT fetch (status: ${result.status || 'N/A'})`);
      if (result.fetchError) {
        console.log(`      Fetch error: ${result.fetchError}`);
      }
    } else if (result.exists) {
      console.log(`   ⚠️  File exists but CANNOT sign`);
      if (result.signError) {
        console.log(`      Sign error: ${result.signError}`);
      }
    } else {
      console.log(`   ❌ File does NOT exist`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
      if (result.reason) {
        console.log(`      Reason: ${result.reason}`);
      }
      
      // Try to find similar files
      const parentDir = avatarPath.split('/').slice(0, -1).join('/');
      console.log(`   🔍 Checking parent directory: ${parentDir}`);
      const { data: dirFiles } = await supabase.storage
        .from('avatars')
        .list(parentDir, { limit: 10 });
      
      if (dirFiles && dirFiles.length > 0) {
        console.log(`   📁 Found ${dirFiles.length} files in directory:`);
        dirFiles.forEach(f => {
          console.log(`      - ${f.name} (${f.metadata?.size || 'unknown size'})`);
        });
      } else {
        console.log(`   📁 Directory is empty or doesn't exist`);
      }
    }
  }
  
  console.log('\n✅ Verification complete');
}

main().catch(console.error);

