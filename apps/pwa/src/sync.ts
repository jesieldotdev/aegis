/**
 * Orquestra a sincronização com o Google Drive a partir da sessão desbloqueada:
 * baixa o cofre remoto, decifra com a chave em memória, faz o merge por item
 * e reenvia. Como remoto e local usam o MESMO envelope AES-GCM, o Drive nunca
 * vê texto claro.
 *
 * O envelope remoto pode ter sido cifrado com outra senha-mestra? Não — a
 * senha-mestra é a mesma conta; se a decifragem remota falhar, tratamos como
 * "remoto incompatível" e mantemos o local (sem sobrescrever cegamente).
 */
import {
  decryptWithKey,
  encryptWithKey,
  mergeVaults,
  normalizeVault,
  type EncryptedEnvelope,
  type Vault,
} from '@aegis/core';
import { downloadVault, uploadVault } from './google';

export type SyncContext = {
  token: string;
  key: CryptoKey;
  kdf: { salt: string; iterations: number };
};

function envelopeFrom(kdf: { salt: string; iterations: number }, iv: string, ct: string): EncryptedEnvelope {
  return { v: 1, kdf: 'PBKDF2-SHA256', iterations: kdf.iterations, salt: kdf.salt, iv, ct };
}

export type SyncResult = { vault: Vault; changed: boolean };

/**
 * Sincroniza o cofre local com o Drive e retorna o cofre resultante (já
 * mesclado). `changed` indica se o merge alterou o estado local.
 */
export async function syncWithDrive(local: Vault, ctx: SyncContext): Promise<SyncResult> {
  const remoteEnvelope = await downloadVault(ctx.token);

  let merged = normalizeVault(local);
  if (remoteEnvelope) {
    try {
      const plaintext = await decryptWithKey(ctx.key, remoteEnvelope.iv, remoteEnvelope.ct);
      const remote = normalizeVault(JSON.parse(plaintext) as Vault);
      merged = mergeVaults(merged, remote);
    } catch {
      // Remoto cifrado com outra chave (senha-mestra diferente) — não dá para
      // mesclar com segurança; sobrescrevemos com o local nesta conta.
    }
  }

  const localJson = JSON.stringify(normalizeVault(local));
  const mergedJson = JSON.stringify(merged);
  const changed = mergedJson !== localJson;

  // Reenvia sempre que houver remoto inexistente/desatualizado ou merge novo
  const { iv, ct } = await encryptWithKey(ctx.key, mergedJson);
  await uploadVault(ctx.token, envelopeFrom(ctx.kdf, iv, ct));

  return { vault: merged, changed };
}
