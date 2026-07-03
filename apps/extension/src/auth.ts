/**
 * Autenticação Google na extensão (MV3) via `chrome.identity.getAuthToken`.
 *
 * Este é o caminho nativo para extensões: usa um OAuth Client do tipo
 * "Extensão do Chrome" (amarrado ao id do item), declarado no bloco `oauth2`
 * do manifest. NÃO há redirect URI — o Chrome gerencia o token e o refresh.
 * Escopos ficam no manifest; OAuth só autoriza o acesso ao Drive, a chave do
 * cofre nunca sai do dispositivo.
 */

type ManifestOAuth2 = { oauth2?: { client_id?: string } };

export function isGoogleConfigured(): boolean {
  if (typeof chrome === 'undefined' || !chrome.identity?.getAuthToken) return false;
  const manifest = chrome.runtime.getManifest() as ManifestOAuth2;
  return !!manifest.oauth2?.client_id;
}

/** Obtém um access token do Google (mostra o consentimento se interativo). */
export function requestAccessToken(interactive = true): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (result) => {
      const err = chrome.runtime.lastError;
      if (err || !result) {
        reject(new Error(err?.message || 'Não foi possível obter o token'));
        return;
      }
      const token = typeof result === 'string' ? result : result.token;
      if (token) resolve(token);
      else reject(new Error('Sem access token na resposta'));
    });
  });
}

/** Remove o token do cache do Chrome (usado ao desconectar). */
export function revokeToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    if (!chrome.identity?.removeCachedAuthToken) {
      resolve();
      return;
    }
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}
