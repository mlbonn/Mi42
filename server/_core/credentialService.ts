/**
 * server/_core/credentialService.ts
 *
 * Zentrale Verschlüsselung für gespeicherte Credentials (E-Mail-Passwörter etc.)
 * Algorithmus: AES-256-GCM mit PBKDF2-abgeleitetem Schlüssel
 * Format v2: "v2:<iv_hex>:<ciphertext_hex>:<tag_hex>"
 * Legacy-Format (createCipher/EVP): kein Präfix, reiner hex-String
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = 'sha512';
const SALT = 'friday-crm-credential-salt-v2';

function getKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY is not set. Server cannot start without this environment variable.'
    );
  }
  return crypto.pbkdf2Sync(raw, SALT, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

/**
 * Verschlüsselt einen Klartext-String.
 * Gibt einen v2-formatierten String zurück: "v2:<iv>:<ciphertext>:<tag>"
 */
export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `v2:${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Entschlüsselt einen Credential-String.
 * Unterstützt v2-Format und Legacy-Format (EVP-basiertes createCipher).
 */
export function decryptCredential(encryptedData: string): string {
  if (encryptedData.startsWith('v2:')) {
    return decryptV2(encryptedData);
  }
  // Legacy-Format: EVP-basiertes createCipher (OpenSSL-kompatibel)
  return decryptLegacy(encryptedData);
}

function decryptV2(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 4 || parts[0] !== 'v2') {
    throw new Error('Invalid v2 credential format');
  }
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

/**
 * Legacy-Entschlüsselung für Daten, die mit crypto.createCipher('aes-256-cbc', key) verschlüsselt wurden.
 * OpenSSL EVP_BytesToKey: MD5-basierte Key-Derivation ohne IV.
 */
function decryptLegacy(encryptedHex: string): string {
  const rawKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is not set');
  }
  // EVP_BytesToKey: MD5-basiert, wie OpenSSL es implementiert
  const { key, iv } = evpBytesToKey(rawKey, 32, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Repliziert OpenSSL EVP_BytesToKey (MD5, keine Salt-Nutzung wie createCipher).
 * Wird benötigt, um Legacy-Daten zu entschlüsseln.
 */
function evpBytesToKey(
  password: string,
  keyLen: number,
  ivLen: number
): { key: Buffer; iv: Buffer } {
  const passwordBuf = Buffer.from(password, 'utf8');
  const result: Buffer[] = [];
  let prev = Buffer.alloc(0);
  while (Buffer.concat(result).length < keyLen + ivLen) {
    prev = crypto.createHash('md5').update(Buffer.concat([prev, passwordBuf])).digest();
    result.push(prev);
  }
  const combined = Buffer.concat(result);
  return {
    key: combined.slice(0, keyLen),
    iv: combined.slice(keyLen, keyLen + ivLen),
  };
}
