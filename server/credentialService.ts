import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const V2_PREFIX = "v2:";

function getKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("CREDENTIAL_ENCRYPTION_KEY is not set");
  return Buffer.from(key.padEnd(32, "0").slice(0, 32));
}

/**
 * Encrypt a credential value using AES-256-GCM.
 * Output format: "v2:<base64(iv+tag+ciphertext)>"
 */
export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, encrypted]);
  return V2_PREFIX + combined.toString("base64");
}

/**
 * Decrypt a credential value.
 * Accepts only v2: format. Throws on legacy or malformed data.
 */
export function decryptCredential(ciphertext: string): string {
  if (!ciphertext.startsWith(V2_PREFIX)) {
    throw new Error(`Unsupported credential format (expected v2: prefix, got: ${ciphertext.substring(0, 10)})`);
  }
  const key = getKey();
  const combined = Buffer.from(ciphertext.slice(V2_PREFIX.length), "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
