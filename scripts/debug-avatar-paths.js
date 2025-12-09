#!/usr/bin/env node

/**
 * Debug script to check if avatar files exist at the paths in the database
 * This will help us understand why signed URLs return 400 errors
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read config from app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const supabaseUrl = appJson.expo.extra.supabaseUrl;
const supabaseAnonKey = appJson.expo.extra.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase config in app.json');
  process.exit(1);
}

// Use service role for full access
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('   Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkFile(avatarPath, bucket = 'avatars') {
  console.log(`\n🔍 Checking: ${avatarPath}`);
  
  // First, try to list the parent directory
  const pathParts = avatarPath.split('/');
  const fileName = pathParts.pop();
  const parentDir = pathParts.join('/');
  
  console.log(`   Parent dir: ${parentDir || '(root)'}`);
  console.log(`   File name: ${fileName}`);
  
  try {
    // List files in parent directory
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(parentDir || '', { limit: 100 });
    
    if (listError) {
      console.log(`   ❌ Error listing directory: ${listError.message}`);
      return false;
    }
    
    if (!files || files.length === 0) {
      console.log(`   ❌ Directory is empty or doesn't exist`);
      return false;
    }
    
    console.log(`   📁 Found ${files.length} files in directory`);
    
    // Check if our file exists
    const found = files.find(f => f.name === fileName);
    if (found) {
      console.log(`   ✅ File EXISTS!`);
      console.log(`      Size: ${found.metadata?.size || 'unknown'} bytes`);
      console.log(`      Created: ${found.created_at || 'unknown'}`);
      
      // Try to create signed URL
      const { data: signed, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(avatarPath, 3600);
      
      if (signError) {
        console.log(`   ⚠️  Can create signed URL but error: ${signError.message}`);
        return false;
      }
      
      console.log(`   ✅ Can create signed URL`);
      console.log(`      URL: ${signed.signedUrl.substring(0, 80)}...`);
      
      // Try to actually fetch it
      try {
        const response = await fetch(signed.signedUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log(`   ✅ File is accessible via signed URL (status: ${response.status})`);
          return true;
        } else {
          console.log(`   ❌ Signed URL returns error: ${response.status} ${response.statusText}`);
          return false;
        }
      } catch (fetchError) {
        console.log(`   ❌ Error fetching signed URL: ${fetchError.message}`);
        return false;
      }
    } else {
      console.log(`   ❌ File NOT FOUND in directory`);
      console.log(`   📋 Files in directory:`);
      files.slice(0, 10).forEach(f => {
        console.log(`      - ${f.name} (${f.metadata?.size || '?'} bytes)`);
      });
      if (files.length > 10) {
        console.log(`      ... and ${files.length - 10} more`);
      }
      return false;
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Debugging avatar file paths...\n');
  
  // Fetch reviewers with avatar_url
  const { data: reviewers, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .not('avatar_url', 'is', null)
    .limit(5); // Check first 5
  
  if (error) {
    console.error('❌ Error fetching reviewers:', error);
    process.exit(1);
  }
  
  console.log(`Found ${reviewers.length} reviewers with avatar_url\n`);
  
  let foundCount = 0;
  let missingCount = 0;
  
  for (const reviewer of reviewers) {
    const avatarPath = reviewer.avatar_url;
    if (!avatarPath) continue;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`👤 ${reviewer.username || reviewer.id}`);
    console.log(`   Database path: ${avatarPath}`);
    
    const exists = await checkFile(avatarPath, 'avatars');
    
    if (exists) {
      foundCount++;
    } else {
      missingCount++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Files found: ${foundCount}`);
  console.log(`   ❌ Files missing: ${missingCount}`);
  
  if (missingCount > 0) {
    console.log(`\n💡 If files are missing, they may have been deleted or moved.`);
    console.log(`   Check Supabase Storage dashboard to see actual file structure.`);
  }
}

main().catch(console.error);
