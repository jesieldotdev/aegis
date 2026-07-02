/**
 * Criptografia do cofre: AES-256-GCM com chave derivada da senha-mestra
 * via PBKDF2-SHA256 (WebCrypto). Argon2id seria preferível, mas exigiria
 * WASM de terceiros; PBKDF2 com 600k iterações segue a recomendação OWASP.
 */

export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export type EncryptedEnvelope = {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 (ciphertext + tag GCM)
};

export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

/**
 * Deriva a chave do cofre a partir da senha-mestra.
 * Extraível para permitir o embrulho (wrap) no desbloqueio biométrico.
 */
export async function deriveVaultKey(
  password: string,
  saltB64: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(saltB64) as unknown as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

/** Cifra um payload com uma chave de cofre já derivada. */
export async function encryptWithKey(
  key: CryptoKey,
  plaintext: string,
): Promise<{ iv: string; ct: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

/** Decifra um payload com uma chave de cofre já derivada. */
export async function decryptWithKey(key: CryptoKey, ivB64: string, ctB64: string): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivB64) as unknown as BufferSource },
    key,
    fromBase64(ctB64) as unknown as BufferSource,
  );
  return new TextDecoder().decode(pt);
}

/** Cifra um payload (string) com a senha-mestra — usado no backup .aegis. */
export async function encrypt(plaintext: string, password: string): Promise<EncryptedEnvelope> {
  const salt = randomSalt();
  const key = await deriveVaultKey(password, salt);
  const { iv, ct } = await encryptWithKey(key, plaintext);
  return { v: 1, kdf: 'PBKDF2-SHA256', iterations: PBKDF2_ITERATIONS, salt, iv, ct };
}

/** Decifra um envelope com a senha-mestra. Lança erro se a senha for inválida. */
export async function decrypt(envelope: EncryptedEnvelope, password: string): Promise<string> {
  const key = await deriveVaultKey(password, envelope.salt, envelope.iterations);
  return decryptWithKey(key, envelope.iv, envelope.ct);
}
