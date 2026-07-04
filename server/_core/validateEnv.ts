/**
 * server/_core/validateEnv.ts
 *
 * Fail-Fast Umgebungsvariablen-Validierung.
 * Wird beim Server-Start aufgerufen – verhindert Start ohne kritische Variablen.
 */

const FORBIDDEN_FALLBACKS = [
  'change-in-production',
  'change-me',
  'your-32-char',
  'your-secret-key',
  'default-secret',
  'friday-crm-default-secret',
];

function isFallback(value: string): boolean {
  return FORBIDDEN_FALLBACKS.some(fb => value.toLowerCase().includes(fb.toLowerCase()));
}

export function validateEnv(): void {
  const errors: string[] = [];

  // JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is not set');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  } else if (isFallback(jwtSecret)) {
    errors.push('JWT_SECRET contains a forbidden fallback value – set a real secret');
  }

  // CREDENTIAL_ENCRYPTION_KEY
  const credKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!credKey) {
    errors.push('CREDENTIAL_ENCRYPTION_KEY is not set');
  } else if (credKey.length < 32) {
    errors.push('CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters');
  } else if (isFallback(credKey)) {
    errors.push('CREDENTIAL_ENCRYPTION_KEY contains a forbidden fallback value – set a real secret');
  }

  // JWT_SECRET und CREDENTIAL_ENCRYPTION_KEY sollten unterschiedlich sein (Best Practice)
  // Hinweis: Gleiche Werte sind technisch möglich, aber nicht empfohlen
  if (jwtSecret && credKey && jwtSecret === credKey) {
    console.warn('[validateEnv] WARNING: JWT_SECRET and CREDENTIAL_ENCRYPTION_KEY are identical – consider using different values');
  }

  // DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    errors.push('DATABASE_URL is not set');
  }

  // DEV_MODE in Production verbieten
  const devMode = process.env.DEV_MODE;
  const nodeEnv = process.env.NODE_ENV;
  if (devMode === 'true' && nodeEnv === 'production') {
    errors.push('DEV_MODE=true is not allowed in NODE_ENV=production');
  }

  if (errors.length > 0) {
    console.error('\n[validateEnv] Server startup aborted due to configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error('\nPlease fix the above errors in your .env file and restart.\n');
    process.exit(1);
  }
}
