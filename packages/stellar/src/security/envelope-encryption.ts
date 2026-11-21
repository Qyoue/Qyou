/**
 * AES-256-GCM envelope encryption for `WalletLink.encryptedSecretKey` (#1145).
 * A fresh data key encrypts each secret; the data key is wrapped by a KMS key. Rotation only
 * re-wraps data keys. Stored format: base64(JSON envelope).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Implemented by the cloud KMS (generateDataKey/decrypt) or, in tests, by a local fake. */
export interface KeyManagementService {
  /** Returns a fresh 32-byte data key in plaintext and wrapped under the current master key. */
  generateDataKey(): Promise<{ plaintext: Buffer; wrapped: string; keyId: string }>;
  unwrapDataKey(wrapped: string, keyId: string): Promise<Buffer>;
  /** Re-encrypts a wrapped data key under the current master key without exposing it. */
  rewrapDataKey(wrapped: string, keyId: string): Promise<{ wrapped: string; keyId: string }>;
}

interface Envelope {
  v: 1;
  keyId: string;
  wrappedKey: string;
  iv: string;
  tag: string;
  ct: string;
}

const b64 = (b: Buffer) => b.toString('base64');

export async function encryptSecret(kms: KeyManagementService, secret: string, aad = ''): Promise<string> {
  const { plaintext, wrapped, keyId } = await kms.generateDataKey();
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', plaintext, iv);
    cipher.setAAD(Buffer.from(aad));
    const ct = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const env: Envelope = { v: 1, keyId, wrappedKey: wrapped, iv: b64(iv), tag: b64(cipher.getAuthTag()), ct: b64(ct) };
    return b64(Buffer.from(JSON.stringify(env)));
  } finally {
    plaintext.fill(0);
  }
}

/** `aad` should bind the ciphertext to its owner (for example the userId). */
export async function decryptSecret(kms: KeyManagementService, stored: string, aad = ''): Promise<string> {
  const env = JSON.parse(Buffer.from(stored, 'base64').toString('utf8')) as Envelope;
  if (env.v !== 1) throw new Error(`Unsupported envelope version ${env.v}`);
  const key = await kms.unwrapDataKey(env.wrappedKey, env.keyId);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(env.iv, 'base64'));
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(Buffer.from(env.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(env.ct, 'base64')), decipher.final()]).toString('utf8');
  } finally {
    key.fill(0);
  }
}

/** Rotation: only the data key is re-wrapped under the current master key; ciphertext is untouched. */
export async function rewrapSecret(kms: KeyManagementService, stored: string): Promise<string> {
  const env = JSON.parse(Buffer.from(stored, 'base64').toString('utf8')) as Envelope;
  const next = await kms.rewrapDataKey(env.wrappedKey, env.keyId);
  return b64(Buffer.from(JSON.stringify({ ...env, wrappedKey: next.wrapped, keyId: next.keyId })));
}
