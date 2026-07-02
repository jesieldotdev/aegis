/**
 * Persistência local do cofre (sem backend):
 * - O cofre vive em localStorage SEMPRE cifrado (AES-256-GCM, chave derivada
 *   da senha-mestra via PBKDF2). Nada é gravado em texto claro.
 * - Para o desbloqueio biométrico, a chave do cofre é embrulhada (wrapKey)
 *   por uma chave de dispositivo não-extraível guardada no IndexedDB, e o
 *   unwrap só acontece após uma asserção WebAuthn com userVerification.
 *   (Em produção, o ideal é condicionar criptograficamente via PRF/largeBlob.)
 */
import { fromBase64, toBase64, type EncryptedEnvelope } from '@aegis/core';

const VAULT_KEY = 'aegis.vault.v1';
const SETTINGS_KEY = 'aegis.settings.v1';
const WRAPPED_KEY = 'aegis.wrappedKey.v1';
const GOOGLE_KEY = 'aegis.google.v1';

// ---------- Cofre cifrado ----------

export function loadVaultEnvelope(): EncryptedEnvelope | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? (JSON.parse(raw) as EncryptedEnvelope) : null;
  } catch {
    return null;
  }
}

export function saveVaultEnvelope(envelope: EncryptedEnvelope): void {
  localStorage.setItem(VAULT_KEY, JSON.stringify(envelope));
}

// ---------- Ajustes (fora do cofre: necessários antes do desbloqueio) ----------

export type Settings = {
  bio: boolean;
  backup: boolean;
  autoLockMin: number;
};

export const DEFAULT_SETTINGS: Settings = { bio: false, backup: true, autoLockMin: 1 };

// ---------- Conta Google lembrada (só e-mail/nome, para reconectar) ----------

export type RememberedGoogle = { email: string; name: string; picture?: string };

export function loadGoogle(): RememberedGoogle | null {
  try {
    const raw = localStorage.getItem(GOOGLE_KEY);
    return raw ? (JSON.parse(raw) as RememberedGoogle) : null;
  } catch {
    return null;
  }
}

export function saveGoogle(account: RememberedGoogle | null): void {
  if (account) localStorage.setItem(GOOGLE_KEY, JSON.stringify(account));
  else localStorage.removeItem(GOOGLE_KEY);
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ---------- Chave de dispositivo (IndexedDB) + chave do cofre embrulhada ----------

const DB_NAME = 'aegis-keys';
const STORE = 'keys';
const DEVICE_KEY_ID = 'device-wrap-key';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

let deviceKeyPromise: Promise<CryptoKey> | null = null;

/** Chave AES não-extraível do dispositivo (criada uma única vez). */
export function getDeviceKey(): Promise<CryptoKey> {
  deviceKeyPromise ??= (async () => {
    const db = await openDb();
    const existing = await idbGet<CryptoKey>(db, DEVICE_KEY_ID);
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'wrapKey',
      'unwrapKey',
    ]);
    await idbPut(db, DEVICE_KEY_ID, key);
    return key;
  })();
  return deviceKeyPromise;
}

/** Embrulha a chave do cofre para o desbloqueio biométrico. */
export async function storeWrappedVaultKey(vaultKey: CryptoKey): Promise<void> {
  const deviceKey = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey('raw', vaultKey, deviceKey, {
    name: 'AES-GCM',
    iv: iv as unknown as BufferSource,
  });
  localStorage.setItem(
    WRAPPED_KEY,
    JSON.stringify({ iv: toBase64(iv), key: toBase64(new Uint8Array(wrapped)) }),
  );
}

export function hasWrappedVaultKey(): boolean {
  return localStorage.getItem(WRAPPED_KEY) !== null;
}

export function clearWrappedVaultKey(): void {
  localStorage.removeItem(WRAPPED_KEY);
}

/** Desembrulha a chave do cofre (chamar somente após a asserção WebAuthn). */
export async function unwrapVaultKey(): Promise<CryptoKey | null> {
  const raw = localStorage.getItem(WRAPPED_KEY);
  if (!raw) return null;
  try {
    const { iv, key } = JSON.parse(raw) as { iv: string; key: string };
    const deviceKey = await getDeviceKey();
    return await crypto.subtle.unwrapKey(
      'raw',
      fromBase64(key) as unknown as BufferSource,
      deviceKey,
      { name: 'AES-GCM', iv: fromBase64(iv) as unknown as BufferSource },
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  } catch {
    return null;
  }
}
