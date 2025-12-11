const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Try to read from app.json as fallback
let appConfig = {};
try {
  // Try multiple possible paths
  const possiblePaths = [
    path.join(__dirname, '..', 'app.json'),
    path.join(process.cwd(), 'app.json'),
    './app.json'
  ];
  
  for (const appJsonPath of possiblePaths) {
    try {
      if (fs.existsSync(appJsonPath)) {
        const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
        appConfig = JSON.parse(appJsonContent);
        console.log('✅ Loaded app.json from:', appJsonPath);
        break;
      }
    } catch (err) {
      // Try next path
    }
  }
} catch (err) {
  console.warn('Could not read app.json:', err.message);
}

// Hardcoded from app.json for now
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || appConfig?.extra?.supabaseUrl || 'https://zxazjbduiistnfstnwka.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    appConfig?.extra?.supabaseAnonKey ||
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YXpqYmR1aWlzdG5mc3Rud2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTY0NDYsImV4cCI6MjA3MTMzMjQ0Nn0.apdP9iKtqvt8os_pdq8dgojMHSPUk5HsIVLjzw1gevA';

console.log('Debug:', {
  hasEnvKey: !!(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  hasAppConfig: !!appConfig?.extra,
  hasAppKey: !!appConfig?.extra?.supabaseAnonKey,
  keyLength: supabaseKey ? supabaseKey.length : 0
});

if (!supabaseKey) {
  console.error('❌ Missing Supabase key. Please set SUPABASE_SERVICE_ROLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  console.error('   Or ensure app.json has extra.supabaseAnonKey');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvatars() {
  console.log('🔍 Checking avatar files in storage...\n');
  
  const bucket = 'avatars';
  
  // Check some of the problematic paths
  const testPaths = [
    'temp-uploads/reviewer-signup-1765243815450/avatar/',
    'temp-uploads/reviewer-signup-1764904927499/avatar/',
    'temp-uploads/reviewer-signup-1764894101315/avatar/',
    'temp-uploads/reviewer-signup-1764883314266/avatar/',
    'temp-uploads/reviewer-signup-1764725445995/avatar/',
  ];
  
  for (const path of testPaths) {
    console.log(`\n📁 Checking: ${path}`);
    
    try {
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list(path, { limit: 10, sortBy: { column: 'created_at', order: 'desc' } });
      
      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
        continue;
      }
      
      if (!files || files.length === 0) {
        console.log(`  ⚠️  No files found in this directory`);
      } else {
        console.log(`  ✅ Found ${files.length} file(s):`);
        files.forEach(file => {
          console.log(`     - ${file.name} (${file.metadata?.size || 'unknown size'} bytes)`);
        });
      }
    } catch (err) {
      console.error(`  ❌ Exception: ${err.message}`);
    }
  }
  
  // Check root of avatars bucket
  console.log('\n\n📁 Checking root of avatars bucket...');
  try {
    const { data: rootFiles, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: 20 });
    
    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else if (rootFiles && rootFiles.length > 0) {
      console.log(`  ✅ Found ${rootFiles.length} item(s) in root:`);
      rootFiles.forEach(item => {
        console.log(`     - ${item.name}${item.id ? ' (folder)' : ' (file)'}`);
      });
    } else {
      console.log(`  ⚠️  Root is empty`);
    }
  } catch (err) {
    console.error(`  ❌ Exception: ${err.message}`);
  }
  
  // Check temp-uploads root
  console.log('\n\n📁 Checking temp-uploads/ root...');
  try {
    const { data: tempRoot, error } = await supabase.storage
      .from(bucket)
      .list('temp-uploads', { limit: 10 });
    
    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else if (tempRoot && tempRoot.length > 0) {
      console.log(`  ✅ Found ${tempRoot.length} item(s) in temp-uploads:`);
      tempRoot.forEach(item => {
        console.log(`     - ${item.name}${item.id ? ' (folder)' : ' (file)'}`);
      });
    } else {
      console.log(`  ⚠️  temp-uploads is empty or doesn't exist`);
    }
  } catch (err) {
    console.error(`  ❌ Exception: ${err.message}`);
  }
}

checkAvatars().catch(console.error);

