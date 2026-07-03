/**
 * Estado do cofre na extensão:
 * - `storage.local`: envelope cifrado (para autofill offline) + conta Google.
 * - `storage.session`: cofre já decifrado e o access token — só existem
 *   enquanto o navegador está aberto, e são liberados para o content script
 *   (que precisa das credenciais para o autofill) via access level.
 *
 * Guardar o cofre decifrado em session storage é um trade-off consciente: é o
 * que permite o autofill sem repedir a senha-mestra a cada página, e some ao
 * fechar o navegador. Bloquear pela popup limpa a sessão na hora.
 */
import { fromBase64, toBase64, type EncryptedEnvelope, type GoogleAccount, type Vault } from '@aegis/core';

const ENV_KEY = 'aegis.envelope';
const ACCOUNT_KEY = 'aegis.account';
const VAULT_KEY = 'aegis.vault';
const TOKEN_KEY = 'aegis.token';
const KEY_KEY = 'aegis.key';

const hasChrome = typeof chrome !== 'undefined' && !!chrome.storage;

// ---- Envelope cifrado (local) ----

export async function getStoredEnvelope(): Promise<EncryptedEnvelope | null> {
  if (!hasChrome) return null;
  const r = await chrome.storage.local.get(ENV_KEY);
  return (r[ENV_KEY] as EncryptedEnvelope | undefined) ?? null;
}

export async function setStoredEnvelope(env: EncryptedEnvelope): Promise<void> {
  if (!hasChrome) return;
  await chrome.storage.local.set({ [ENV_KEY]: env });
}

// ---- Conta Google (local) ----

export async function getStoredAccount(): Promise<GoogleAccount | null> {
  if (!hasChrome) return null;
  const r = await chrome.storage.local.get(ACCOUNT_KEY);
  return (r[ACCOUNT_KEY] as GoogleAccount | undefined) ?? null;
}

export async function setStoredAccount(account: GoogleAccount | null): Promise<void> {
  if (!hasChrome) return;
  if (account) await chrome.storage.local.set({ [ACCOUNT_KEY]: account });
  else await chrome.storage.local.remove(ACCOUNT_KEY);
}

// ---- Cofre decifrado + token (session) ----

export async function getSessionVault(): Promise<Vault | null> {
  if (!hasChrome) return null;
  const r = await chrome.storage.session.get(VAULT_KEY);
  return (r[VAULT_KEY] as Vault | undefined) ?? null;
}

export async function setSessionVault(vault: Vault): Promise<void> {
  if (!hasChrome) return;
  await chrome.storage.session.set({ [VAULT_KEY]: vault });
}

export async function getSessionToken(): Promise<string | null> {
  if (!hasChrome) return null;
  const r = await chrome.storage.session.get(TOKEN_KEY);
  return (r[TOKEN_KEY] as string | undefined) ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  if (!hasChrome) return;
  await chrome.storage.session.set({ [TOKEN_KEY]: token });
}

/**
 * Chave do cofre na sessão (bytes exportados). Necessária para re-cifrar o
 * cofre ao criar contas pela extensão, mesmo que a popup seja reaberta. Fica
 * no mesmo nível de exposição do cofre já decifrado em sessão.
 */
export async function setSessionKey(key: CryptoKey): Promise<void> {
  if (!hasChrome) return;
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  await chrome.storage.session.set({ [KEY_KEY]: toBase64(raw) });
}

export async function getSessionKey(): Promise<CryptoKey | null> {
  if (!hasChrome) return null;
  const r = await chrome.storage.session.get(KEY_KEY);
  const b64 = r[KEY_KEY] as string | undefined;
  if (!b64) return null;
  try {
    return await crypto.subtle.importKey('raw', fromBase64(b64) as unknown as BufferSource, { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt',
    ]);
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (!hasChrome) return;
  await chrome.storage.session.remove([VAULT_KEY, TOKEN_KEY, KEY_KEY]);
}

export async function disconnect(): Promise<void> {
  if (!hasChrome) return;
  await chrome.storage.local.remove([ENV_KEY, ACCOUNT_KEY]);
  await clearSession();
}

/** Libera o storage.session para o content script (mundo isolado). */
export async function allowContentScriptSession(): Promise<void> {
  if (!hasChrome) return;
  try {
    await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
  } catch {
    // Navegadores antigos podem não suportar — autofill fica só via popup.
  }
}
