/**
 * Autenticação Google na extensão (MV3). A popup não pode carregar o script
 * do GIS (CSP de páginas de extensão bloqueia scripts remotos), então usamos
 * `chrome.identity.launchWebAuthFlow` com um OAuth Client do tipo "Web
 * application" e o redirect `https://<extension-id>.chromiumapp.org/`.
 *
 * Fluxo implícito (response_type=token): o access token volta no fragmento da
 * URL de redirecionamento. Escopo mínimo drive.appdata — OAuth só autoriza o
 * acesso ao Drive; a chave do cofre nunca sai do dispositivo.
 */
import { DRIVE_SCOPES } from '@aegis/core';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

export function isGoogleConfigured(): boolean {
  return typeof CLIENT_ID === 'string' && CLIENT_ID.length > 0;
}

/** Abre o consentimento e retorna um access token do Google. */
export async function requestAccessToken(interactive = true): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('VITE_GOOGLE_CLIENT_ID não configurado');
  const redirectUri = chrome.identity.getRedirectURL();
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: DRIVE_SCOPES,
    prompt: 'consent',
  });
  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: `${AUTH_ENDPOINT}?${params}`,
    interactive,
  });
  const fragment = new URL(responseUrl).hash.slice(1);
  const token = new URLSearchParams(fragment).get('access_token');
  if (!token) throw new Error('Sem access token na resposta');
  return token;
}
