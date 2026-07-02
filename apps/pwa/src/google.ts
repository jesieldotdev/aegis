/**
 * Sincronização via Google Drive — o cofre cifrado (mesmo envelope AES-GCM
 * gravado localmente) vive na pasta oculta `appDataFolder`, por-usuário e
 * por-app. O Google só enxerga ciphertext: a chave nunca sai do dispositivo.
 *
 * Autenticação: Google Identity Services (GIS) token client, escopo mínimo
 * `drive.appdata` + OpenID para identificar a conta. OAuth é usado APENAS
 * para autenticar/autorizar o acesso ao Drive — a descriptografia do cofre
 * continua derivada da senha-mestra.
 */
import type { EncryptedEnvelope } from '@aegis/core';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata openid email profile';
const FILE_NAME = 'aegis-vault.json';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

export type GoogleAccount = { email: string; name: string; picture?: string };

export function isGoogleConfigured(): boolean {
  return typeof CLIENT_ID === 'string' && CLIENT_ID.length > 0;
}

// ---------- Carregamento do GIS ----------

type TokenResponse = { access_token: string; expires_in: number; error?: string };
type TokenClient = { requestAccessToken: (opts?: { prompt?: string }) => void };
type Gsi = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        prompt?: string;
        callback: (resp: TokenResponse) => void;
        error_callback?: (err: { type?: string }) => void;
      }) => TokenClient;
      revoke: (token: string, done?: () => void) => void;
    };
  };
};

declare global {
  interface Window {
    google?: Gsi;
  }
}

let gisPromise: Promise<Gsi> | null = null;

function loadGis(): Promise<Gsi> {
  gisPromise ??= new Promise<Gsi>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google);
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () =>
      window.google?.accounts?.oauth2
        ? resolve(window.google)
        : reject(new Error('GIS indisponível'));
    script.onerror = () => reject(new Error('Falha ao carregar o Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

// ---------- Token de acesso ----------

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Obtém um access token. `interactive` mostra o consentimento (necessário na
 * primeira conexão); depois tenta silenciosamente (`prompt: ''`).
 */
export async function getAccessToken(interactive: boolean): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('Google Client ID não configurado');
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.value;

  const gis = await loadGis();
  return new Promise<string>((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID!,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error || !resp.access_token) return reject(new Error(resp.error || 'Sem token'));
        cachedToken = { value: resp.access_token, expiresAt: Date.now() + resp.expires_in * 1000 };
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err.type || 'Autorização cancelada')),
    });
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  });
}

export function clearToken(): void {
  const token = cachedToken?.value;
  cachedToken = null;
  if (token) {
    loadGis()
      .then((gis) => gis.accounts.oauth2.revoke(token))
      .catch(() => {});
  }
}

// ---------- Perfil da conta ----------

export async function fetchAccount(token: string): Promise<GoogleAccount> {
  const res = await fetch(USERINFO, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Falha ao obter a conta Google');
  const data = (await res.json()) as { email: string; name?: string; picture?: string };
  return { email: data.email, name: data.name ?? data.email, picture: data.picture };
}

// ---------- Drive appDataFolder ----------

async function findFileId(token: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${FILE_NAME}'`,
    fields: 'files(id,modifiedTime)',
    pageSize: '1',
  });
  const res = await fetch(`${DRIVE_FILES}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive list falhou (${res.status})`);
  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files?.[0]?.id ?? null;
}

/** Baixa e faz o parse do envelope cifrado remoto (null se ainda não existe). */
export async function downloadVault(token: string): Promise<EncryptedEnvelope | null> {
  const id = await findFileId(token);
  if (!id) return null;
  const res = await fetch(`${DRIVE_FILES}/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download falhou (${res.status})`);
  return (await res.json()) as EncryptedEnvelope;
}

/** Envia o envelope cifrado (cria ou substitui) via upload multipart. */
export async function uploadVault(token: string, envelope: EncryptedEnvelope): Promise<void> {
  const id = await findFileId(token);
  const boundary = 'aegis-' + crypto.randomUUID();
  const metadata = id ? {} : { name: FILE_NAME, parents: ['appDataFolder'] };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    `${JSON.stringify(envelope)}\r\n` +
    `--${boundary}--`;

  const url = id
    ? `${DRIVE_UPLOAD}/${id}?uploadType=multipart&fields=id`
    : `${DRIVE_UPLOAD}?uploadType=multipart&fields=id`;
  const res = await fetch(url, {
    method: id ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Drive upload falhou (${res.status})`);
}
