/**
 * Autenticação Google no navegador (PWA) via Google Identity Services (GIS).
 * A camada REST do Drive vem de @aegis/core (compartilhada com a extensão);
 * aqui fica apenas a obtenção do access token e o perfil da conta.
 *
 * OAuth é usado APENAS para autenticar o acesso ao Drive — a descriptografia
 * do cofre continua derivada da senha-mestra.
 */
import { DRIVE_SCOPES } from '@aegis/core';

export {
  fetchAccount,
  downloadVaultEnvelope as downloadVault,
  uploadVaultEnvelope as uploadVault,
  type GoogleAccount,
} from '@aegis/core';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GIS_SRC = 'https://accounts.google.com/gsi/client';

export function isGoogleConfigured(): boolean {
  return typeof CLIENT_ID === 'string' && CLIENT_ID.length > 0;
}

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

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Obtém um access token. `interactive` mostra o consentimento (primeira
 * conexão); depois tenta silenciosamente (`prompt: ''`).
 */
export async function getAccessToken(interactive: boolean): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('Google Client ID não configurado');
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.value;

  const gis = await loadGis();
  return new Promise<string>((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID!,
      scope: DRIVE_SCOPES,
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

/**
 * Retorna um token válido do cache em memória, ou null. NUNCA abre UI —
 * é o que a sincronização automática usa para jamais interromper o usuário
 * com o diálogo do Google ao desbloquear/salvar.
 */
export function getCachedToken(): string | null {
  return cachedToken && cachedToken.expiresAt - 60_000 > Date.now() ? cachedToken.value : null;
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
