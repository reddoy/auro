const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Configuration
const KEY_ID = 'P7L6DM5W7H'; // From the filename
const SERVICES_ID = 'com.auro.app.appie'; // Your Services ID

// Get Team ID from command line argument or environment variable
const TEAM_ID = process.argv[2] || process.env.APPLE_TEAM_ID;

// Path to the private key file
const privateKeyPath = path.join(__dirname, '..', 'app', 'AuthKey_P7L6DM5W7H.p8');

// Read the private key
let privateKey;
try {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
} catch (error) {
  console.error('Error reading private key file:', error.message);
  console.error('Make sure the file exists at:', privateKeyPath);
  process.exit(1);
}

// Validate Team ID
if (!TEAM_ID) {
  console.error('❌ Error: Apple Team ID is required!');
  console.error('\nUsage:');
  console.error('  node scripts/generate-apple-jwt.js YOUR_TEAM_ID');
  console.error('\nOr set environment variable:');
  console.error('  $env:APPLE_TEAM_ID="YOUR_TEAM_ID"; node scripts/generate-apple-jwt.js');
  console.error('\nTo find your Team ID:');
  console.error('  1. Go to https://developer.apple.com/account');
  console.error('  2. Click on "Membership" in the top right');
  console.error('  3. Your Team ID is the 10-character string (e.g., ABC123DEF4)');
  process.exit(1);
}

// Generate the JWT
const now = Math.floor(Date.now() / 1000);
const token = jwt.sign(
  {
    iss: TEAM_ID,
    iat: now,
    exp: now + 86400 * 180, // Valid for 6 months (180 days)
    aud: 'https://appleid.apple.com',
    sub: SERVICES_ID,
  },
  privateKey,
  {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: KEY_ID,
    },
  }
);

console.log('\n✅ Apple Sign-In JWT Client Secret Generated!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nCopy this JWT and paste it into Supabase:\n');
console.log(token);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📋 Configuration Summary:');
console.log(`   Team ID: ${TEAM_ID}`);
console.log(`   Key ID: ${KEY_ID}`);
console.log(`   Services ID: ${SERVICES_ID}`);
console.log(`   Expires: ${new Date((now + 86400 * 180) * 1000).toLocaleString()}`);
console.log('\n💡 Note: This JWT is valid for 6 months. You\'ll need to regenerate it after expiration.\n');

