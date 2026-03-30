const { createClient } = require('@supabase/supabase-js');

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY or anon key env vars.'
  );
  process.exit(1);
}

console.log('Debug:', {
  hasUrl: !!supabaseUrl,
  keyLength: supabaseKey ? supabaseKey.length : 0,
});

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
        files.forEach((file) => {
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
      rootFiles.forEach((item) => {
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
      tempRoot.forEach((item) => {
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
