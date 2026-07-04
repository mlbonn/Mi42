/**
 * scripts/reencryptEmailAccounts.ts
 *
 * Idempotentes Re-Encrypt-Script: Migriert alle email_accounts_new-Einträge
 * vom Legacy-Format (createCipher) auf v2-Format (AES-256-GCM).
 *
 * Ausführen: npx ts-node scripts/reencryptEmailAccounts.ts
 * Oder nach Build: node dist/scripts/reencryptEmailAccounts.js
 */

import 'dotenv/config';
import crypto from 'crypto';
import mysql from 'mysql2/promise';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = 'sha512';
const SALT = 'friday-crm-credential-salt-v2';

function getKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) throw new Error('CREDENTIAL_ENCRYPTION_KEY not set');
  return crypto.pbkdf2Sync(raw, SALT, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

function encryptV2(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `v2:${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

function evpBytesToKey(password: string, keyLen: number, ivLen: number): { key: Buffer; iv: Buffer } {
  const passwordBuf = Buffer.from(password, 'utf8');
  const result: Buffer[] = [];
  let prev = Buffer.alloc(0);
  while (Buffer.concat(result).length < keyLen + ivLen) {
    prev = crypto.createHash('md5').update(Buffer.concat([prev, passwordBuf])).digest();
    result.push(prev);
  }
  const combined = Buffer.concat(result);
  return { key: combined.slice(0, keyLen), iv: combined.slice(keyLen, keyLen + ivLen) };
}

function decryptLegacy(encryptedHex: string): string {
  const rawKey = process.env.CREDENTIAL_ENCRYPTION_KEY || 'your-32-char-secret-key-here!!';
  const { key, iv } = evpBytesToKey(rawKey, 32, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function decryptV2(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 4 || parts[0] !== 'v2') throw new Error('Invalid v2 format');
  const iv = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];
  const tag = Buffer.from(parts[3], 'hex');
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  const [rows] = await conn.execute<any[]>(
    'SELECT id, passwordEncrypted FROM email_accounts_new WHERE passwordEncrypted IS NOT NULL'
  );

  console.log(`[reencrypt] Found ${rows.length} accounts to check`);

  let migrated = 0;
  let alreadyV2 = 0;
  let errors = 0;

  for (const row of rows) {
    const { id, passwordEncrypted } = row;

    if (!passwordEncrypted) continue;

    // Bereits v2 → überspringen (idempotent)
    if (passwordEncrypted.startsWith('v2:')) {
      alreadyV2++;
      continue;
    }

    try {
      // Legacy entschlüsseln
      const plaintext = decryptLegacy(passwordEncrypted);
      // Mit v2 neu verschlüsseln
      const newEncrypted = encryptV2(plaintext);
      // Verifizieren
      const verified = decryptV2(newEncrypted);
      if (verified !== plaintext) {
        throw new Error('Verification failed after re-encryption');
      }
      await conn.execute(
        'UPDATE email_accounts_new SET passwordEncrypted = ? WHERE id = ?',
        [newEncrypted, id]
      );
      migrated++;
      console.log(`[reencrypt] Migrated account id=${id}`);
    } catch (err: any) {
      errors++;
      console.error(`[reencrypt] Error for account id=${id}: ${err.message}`);
    }
  }

  await conn.end();

  console.log(`\n[reencrypt] Done: ${migrated} migrated, ${alreadyV2} already v2, ${errors} errors`);
  if (errors > 0) process.exit(1);
}

main().catch(err => {
  console.error('[reencrypt] Fatal:', err);
  process.exit(1);
});
