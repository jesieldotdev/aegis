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
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const REDIRECT_STATE_KEY = 'aegis-google-redirect';

export function isGoogleConfigured(): boolean {
  return typeof CLIENT_ID === 'string' && CLIENT_ID.length > 0;
}

/** O que estava em andamento quando caímos para o fluxo de redirect. */
export type GoogleAuthIntent = 'connect' | 'restore';

type TokenResponse = { access_token: string; expires_in: number; error?: string };
type TokenClient = { requestAccessToken: (opts?: { prompt?: string }) => void };
type Gsi = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        prompt?: string;
        /** login_hint: e-mail da conta já usada, evita o seletor de conta. */
        hint?: string;
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

/**
 * Carrega o script do GIS antecipadamente (ex.: ao montar a tela), sem
 * esperar um clique. `requestAccessToken` precisa rodar dentro do próprio
 * gesto do usuário (clique/tap) para abrir o popup — se o script ainda
 * estiver carregando nesse momento, o `await` quebra essa cadeia e o
 * navegador (principalmente no Chrome Android) fecha o popup imediatamente.
 */
export function preloadGis(): Promise<Gsi> {
  return loadGis();
}

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
 * Em PWAs instaladas (modo standalone, comum no Android) o navegador bloqueia
 * o `window.open` do popup do GIS — ele nem chega a abrir, e o GIS reporta
 * `popup_failed_to_open` no `error_callback`. A única saída nesse caso é
 * navegar a própria janela até o Google (fluxo de redirect) e voltar com o
 * token na URL depois do consentimento.
 */
function redirectUri(): string {
  return `${window.location.origin}/`;
}

function buildAuthUrl(hint: string | undefined, state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: DRIVE_SCOPES,
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  });
  if (hint) params.set('login_hint', hint);
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

function beginRedirectAuth(intent: GoogleAuthIntent, hint?: string): void {
  const state = crypto.randomUUID();
  sessionStorage.setItem(REDIRECT_STATE_KEY, JSON.stringify({ intent, state }));
  window.location.assign(buildAuthUrl(hint, state));
}

export type RedirectAuthResult =
  | { status: 'ok'; token: string; intent: GoogleAuthIntent }
  | { status: 'error'; message: string; intent: GoogleAuthIntent | null };

/**
 * Lê o retorno do fluxo de redirect (se houver) e limpa a URL/o estado
 * temporário. Precisa ser chamado uma vez ao montar o app — é isso que
 * fecha o ciclo aberto por `beginRedirectAuth` depois do reload.
 */
export function consumeRedirectAuth(): RedirectAuthResult | null {
  const hash = window.location.hash;
  if (!hash || (!hash.includes('access_token=') && !hash.includes('error='))) return null;

  const raw = sessionStorage.getItem(REDIRECT_STATE_KEY);
  sessionStorage.removeItem(REDIRECT_STATE_KEY);
  history.replaceState(null, '', window.location.pathname + window.location.search);

  let pending: { intent: GoogleAuthIntent; state: string } | null = null;
  try {
    pending = raw ? JSON.parse(raw) : null;
  } catch {
    pending = null;
  }

  const params = new URLSearchParams(hash.slice(1));
  const error = params.get('error');
  if (error) return { status: 'error', message: error, intent: pending?.intent ?? null };

  const token = params.get('access_token');
  const expiresIn = Number(params.get('expires_in') ?? '0');
  if (!token || !pending || params.get('state') !== pending.state) return null;

  cachedToken = { value: token, expiresAt: Date.now() + expiresIn * 1000 };
  return { status: 'ok', token, intent: pending.intent };
}

/**
 * Obtém um access token. `interactive` mostra o consentimento (primeira
 * conexão); depois tenta silenciosamente (`prompt: ''`). Passe `hint` (e-mail
 * da conta já conectada) para o GIS renovar sem exibir o seletor de conta.
 * `intent` só importa se o popup falhar: é o que permite retomar a ação certa
 * (conectar ou restaurar) quando a página recarregar depois do redirect.
 */
export async function getAccessToken(
  interactive: boolean,
  hint?: string,
  intent?: GoogleAuthIntent,
): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('Google Client ID não configurado');
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.value;

  const gis = await loadGis();
  return new Promise<string>((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID!,
      scope: DRIVE_SCOPES,
      hint: hint || undefined,
      callback: (resp) => {
        if (resp.error || !resp.access_token) return reject(new Error(resp.error || 'Sem token'));
        cachedToken = { value: resp.access_token, expiresAt: Date.now() + resp.expires_in * 1000 };
        resolve(resp.access_token);
      },
      error_callback: (err) => {
        if (err.type === 'popup_failed_to_open' && intent) {
          beginRedirectAuth(intent, hint);
          return; // a janela está navegando para o Google; a promise fica pendente
        }
        reject(new Error(err.type || 'Autorização cancelada'));
      },
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
