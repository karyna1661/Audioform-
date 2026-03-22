#!/usr/bin/env node

/**
 * Pre-build Environment Validation Script
 * 
 * Runs BEFORE build to catch missing environment variables early.
 * Fails the build if critical variables are missing in production.
 */

const requiredEnvVars = [
  'AUTH_SESSION_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
];

const optionalEnvVars = [
  'B2_KEY_ID',
  'B2_APPLICATION_KEY',
  'B2_BUCKET_ID',
  'B2_BUCKET_NAME',
  'APIFY_TOKEN',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'REDIS_URL',
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'PRIVY_VERIFICATION_KEY',
  'NEXT_PUBLIC_AUDIOFORM_FEEDBACK_SURVEY_ID',
];

function validate() {
  const isProd = process.env.NODE_ENV === 'production';
  const mode = isProd ? 'PRODUCTION BUILD' : 'DEVELOPMENT';
  
  console.log('\n' + '='.repeat(70));
  console.log(`🔍 ENVIRONMENT VALIDATION - ${mode}`);
  console.log('='.repeat(70) + '\n');

  let hasCriticalErrors = false;
  const warnings = [];

  // Check required variables
  console.log('Checking required environment variables...\n');
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    const isSet = Boolean(value) && value.trim() !== '';
    
    if (!isSet) {
      console.error(`❌ MISSING: ${envVar}`);
      hasCriticalErrors = true;
    } else {
      console.log(`✅ FOUND: ${envVar}`);
    }
  }

  // Check optional variables
  console.log('\nChecking optional environment variables...\n');
  
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar];
    const isSet = Boolean(value) && value.trim() !== '';
    
    if (!isSet) {
      console.warn(`⚠️  NOT SET: ${envVar} (optional)`);
      warnings.push(envVar);
    } else {
      console.log(`✅ FOUND: ${envVar}`);
    }
  }

  console.log('\n' + '-'.repeat(70));
  
  // Handle results
  if (hasCriticalErrors) {
    console.error('\n❌ VALIDATION FAILED\n');
    console.error('Critical environment variables are missing!\n');
    console.error('📝 HOW TO FIX:\n');
    
    if (isProd) {
      console.error('  For Railway/Production deployment:');
      console.error('    1. Go to https://railway.app/');
      console.error('    2. Select your project');
      console.error('    3. Click "Variables" tab');
      console.error('    4. Add all missing variables listed above');
      console.error('    5. Redeploy the application\n');
    } else {
      console.error('  For local development:');
      console.error('    1. Copy .env.example to .env (if not exists)');
      console.error('    2. Fill in all required values');
      console.error('    3. Restart the development server\n');
    }
    
    console.error('Missing variables:');
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      const isSet = Boolean(value) && value.trim() !== '';
      if (!isSet) {
        console.error(`  - ${envVar}`);
      }
    });
    
    console.error('\n' + '='.repeat(70) + '\n');
    
    // Exit with error code in production
    if (isProd) {
      console.error('🛑 BUILD ABORTED - Cannot deploy with missing configuration.\n');
      process.exit(1);
    } else {
      console.error('⚠️  Continuing anyway, but features will be broken.\n');
    }
  } else {
    console.log('\n✅ VALIDATION PASSED\n');
    
    if (warnings.length > 0) {
      console.log(`ℹ️  ${warnings.length} optional variable(s) not set (features may be limited)\n`);
    }
    
    console.log('All required environment variables are present.');
    console.log('Application is ready to build/run.\n');
  }
  
  console.log('='.repeat(70) + '\n');
  
  // Return success status
  return !hasCriticalErrors || !isProd;
}

// Run validation
const success = validate();

// Export for use in other scripts
module.exports = { success };
