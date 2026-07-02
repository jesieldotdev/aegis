/**
 * Camada REST do Google Drive, compartilhada entre PWA e extensão.
 *
 * Apenas `fetch` — sem DOM, sem dependência de UI. Trabalha exclusivamente
 * com o envelope cifrado (o Drive nunca vê texto claro) na pasta oculta
 * `appDataFolder`. A obtenção do access token é responsabilidade de cada
 * plataforma (GIS no navegador, chrome.identity na extensão).
 */
import type { EncryptedEnvelope } from './crypto';

export const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.appdata openid email profile';
export const DRIVE_FILE_NAME = 'aegis-vault.json';

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

export type GoogleAccount = { email: string; name: string; picture?: string };

export async function fetchAccount(token: string): Promise<GoogleAccount> {
  const res = await fetch(USERINFO, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Falha ao obter a conta Google');
  const data = (await res.json()) as { email: string; name?: string; picture?: string };
  return { email: data.email, name: data.name ?? data.email, picture: data.picture };
}

async function findFileId(token: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${DRIVE_FILE_NAME}'`,
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
export async function downloadVaultEnvelope(token: string): Promise<EncryptedEnvelope | null> {
  const id = await findFileId(token);
  if (!id) return null;
  const res = await fetch(`${DRIVE_FILES}/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download falhou (${res.status})`);
  return (await res.json()) as EncryptedEnvelope;
}

/** Envia o envelope cifrado (cria ou substitui) via upload multipart. */
export async function uploadVaultEnvelope(token: string, envelope: EncryptedEnvelope): Promise<void> {
  const id = await findFileId(token);
  const boundary = 'aegis-' + crypto.randomUUID();
  const metadata = id ? {} : { name: DRIVE_FILE_NAME, parents: ['appDataFolder'] };
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
