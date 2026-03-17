/**
 * Test script to verify mobile response upload is working
 * Run this with: node scripts/test-mobile-upload.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Mobile Response Upload Configuration\n');

// Check 1: Environment variables
console.log('✓ Checking environment configuration...');
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('✗ .env file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const hasB2KeyId = envContent.includes('B2_KEY_ID=');
const hasB2AppKey = envContent.includes('B2_APPLICATION_KEY=');
const hasB2Bucket = envContent.includes('B2_BUCKET_ID=') || envContent.includes('B2_BUCKET_NAME=');

console.log(`  - B2_KEY_ID: ${hasB2KeyId ? '✓' : '✗'}`);
console.log(`  - B2_APPLICATION_KEY: ${hasB2AppKey ? '✓' : '✗'}`);
console.log(`  - B2_BUCKET: ${hasB2Bucket ? '✓' : '✗'}`);

// Check 2: Upload directory
console.log('\n✓ Checking upload directory...');
const uploadDir = path.join(__dirname, '..', 'uploads', 'audio-responses');
if (!fs.existsSync(uploadDir)) {
  console.log(`  Creating directory: ${uploadDir}`);
  fs.mkdirSync(uploadDir, { recursive: true });
}
console.log(`  ✓ Upload directory exists: ${uploadDir}`);

// Check 3: API route exists
console.log('\n✓ Checking API route...');
const apiRoute = path.join(__dirname, '..', 'app', 'api', 'responses', 'route.ts');
if (fs.existsSync(apiRoute)) {
  console.log('  ✓ API route exists');
  const apiContent = fs.readFileSync(apiRoute, 'utf-8');
  const hasCorsHeaders = apiContent.includes('Access-Control-Allow-Origin');
  const hasErrorLogging = apiContent.includes('console.error("Error handling audio upload:"');
  console.log(`  - CORS headers: ${hasCorsHeaders ? '✓' : '✗'}`);
  console.log(`  - Error logging: ${hasErrorLogging ? '✓' : '✗'}`);
} else {
  console.error('  ✗ API route not found');
}

// Check 4: Response store configuration
console.log('\n✓ Checking response store...');
const responseStore = path.join(__dirname, '..', 'lib', 'server', 'response-store.ts');
if (fs.existsSync(responseStore)) {
  const storeContent = fs.readFileSync(responseStore, 'utf-8');
  const hasFallbackLogic = storeContent.includes('Always use local storage in development');
  const hasB2Fallback = storeContent.includes('falling back to local storage');
  console.log(`  - Development mode logic: ${hasFallbackLogic ? '✓' : '✗'}`);
  console.log(`  - B2 fallback logic: ${hasB2Fallback ? '✓' : '✗'}`);
} else {
  console.error('  ✗ Response store not found');
}

console.log('\n✅ Configuration check complete!\n');
console.log('Next steps:');
console.log('1. Restart your dev server: npm run dev');
console.log('2. Try submitting a voice response on mobile');
console.log('3. Check the dev logs for "Creating response storage" messages');
console.log('4. Verify files are saved in: uploads/audio-responses/');
