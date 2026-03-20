/**
 * Environment Variable Validation System
 * 
 * This runs at build time and startup to ensure ALL required
 * environment variables are present BEFORE the app starts.
 * 
 * Prevents "mysterious" configuration failures in production.
 */

// Required for BOTH development and production
const requiredEnvVars = [
  // Authentication (CRITICAL - login won't work without these)
  'AUTH_SESSION_SECRET',

  // Database (CRITICAL - no data access without these)
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  
  // App Configuration
  'NEXT_PUBLIC_APP_URL',
] as const;

// Optional but recommended for full functionality
const optionalEnvVars = [
  // Storage (uploads will fallback to local if missing)
  'B2_KEY_ID',
  'B2_APPLICATION_KEY',
  'B2_BUCKET_ID',
  'B2_BUCKET_NAME',
  
  // External Services
  'APIFY_TOKEN',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',

  // Optional auth providers
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'PRIVY_VERIFICATION_KEY',
  
  // Features
  'NEXT_PUBLIC_AUDIOFORM_FEEDBACK_SURVEY_ID',
] as const;

type EnvVarStatus = {
  variable: string;
  present: boolean;
  isCritical: boolean;
  category: string;
};

function categorizeEnvVar(name: string): string {
  if (name.includes('PRIVY')) return 'Authentication';
  if (name.includes('AUTH')) return 'Authentication';
  if (name.includes('SUPABASE')) return 'Database';
  if (name.includes('B2')) return 'Storage';
  if (name.includes('APIFY')) return 'External APIs';
  if (name.includes('GOOGLE')) return 'OAuth';
  if (name.includes('APP_URL')) return 'Configuration';
  return 'Other';
}

function validateEnvironment(): {
  success: boolean;
  missing: EnvVarStatus[];
  warnings: EnvVarStatus[];
} {
  const missing: EnvVarStatus[] = [];
  const warnings: EnvVarStatus[] = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar] ?? '';
    const isSet = Boolean(value) && value.trim() !== '';
    
    if (!isSet) {
      missing.push({
        variable: envVar,
        present: false,
        isCritical: true,
        category: categorizeEnvVar(envVar),
      });
    }
  }

  // Check optional variables (warnings only)
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar] ?? '';
    const isSet = Boolean(value) && value.trim() !== '';
    
    if (!isSet) {
      warnings.push({
        variable: envVar,
        present: false,
        isCritical: false,
        category: categorizeEnvVar(envVar),
      });
    }
  }

  return {
    success: missing.length === 0,
    missing,
    warnings,
  };
}

function printValidationReport(result: ReturnType<typeof validateEnvironment>): void {
  const isProd = process.env.NODE_ENV === 'production';
  const mode = isProd ? 'PRODUCTION' : 'DEVELOPMENT';
  
  console.log('\n' + '='.repeat(70));
  console.log(`🔍 ENVIRONMENT VALIDATION REPORT (${mode})`);
  console.log('='.repeat(70) + '\n');

  // Critical Missing Variables
  if (result.missing.length > 0) {
    console.error('❌ CRITICAL: Missing Required Environment Variables\n');
    
    // Group by category
    const byCategory = result.missing.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof result.missing>);

    for (const [category, items] of Object.entries(byCategory)) {
      console.error(`  ${category}:`);
      items.forEach(item => {
        console.error(`    ❌ ${item.variable}`);
      });
      console.error('');
    }

    console.error('⚠️  The application CANNOT function without these variables.\n');
    
    // Show fix instructions
    console.error('📝 HOW TO FIX:\n');
    console.error('  For Railway deployment:');
    console.error('    1. Go to https://railway.app/');
    console.error('    2. Select your project');
    console.error('    3. Click "Variables" tab');
    console.error('    4. Add all missing variables listed above\n');
    console.error('  For local development:');
    console.error('    1. Copy .env.example to .env');
    console.error('    2. Fill in all required values\n');
    
    if (isProd) {
      console.error('🛑 BUILD ABORTED: Cannot deploy with missing configuration.\n');
    } else {
      console.error('⚠️  Starting anyway, but features will be broken.\n');
    }
  } else {
    console.log('✅ All required environment variables present\n');
  }

  // Warnings for optional variables
  if (result.warnings.length > 0) {
    console.log('⚠️  Optional Variables Not Set (features may be limited)\n');
    
    const byCategory = result.warnings.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof result.warnings>);

    for (const [category, items] of Object.entries(byCategory)) {
      console.log(`  ${category}:`);
      items.forEach(item => {
        console.log(`    ⚠️  ${item.variable}`);
      });
    }
    console.log('');
  }

  // Summary
  console.log('─'.repeat(70));
  if (result.success) {
    console.log('✅ VALIDATION PASSED - Application ready to run');
  } else {
    console.log(`❌ VALIDATION FAILED - ${result.missing.length} critical variable(s) missing`);
  }
  console.log('='.repeat(70) + '\n');
}

// Export validation function for use in other files
export { validateEnvironment, printValidationReport, requiredEnvVars, optionalEnvVars };

// Auto-run validation on import (in development)
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const result = validateEnvironment();
  printValidationReport(result);
  
  if (!result.success) {
    process.exit(1);
  }
}
