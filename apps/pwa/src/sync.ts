/**
 * Orquestra a sincronização com o Google Drive a partir da sessão desbloqueada:
 * baixa o cofre remoto, decifra com a chave em memória, faz o merge por item
 * e reenvia. Como remoto e local usam o MESMO envelope AES-GCM, o Drive nunca
 * vê texto claro.
 *
 * Se o remoto não decifra com a chave local (a senha-mestra foi trocada em
 * outro dispositivo, ou é outro cofre na mesma conta), a sincronização é
 * interrompida com RemoteKeyMismatchError — sobrescrever o Drive aqui
 * desfaria a troca de senha feita no outro aparelho.
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

/** O cofre do Drive está cifrado com outra senha-mestra. */
export class RemoteKeyMismatchError extends Error {
  constructor(readonly remote: EncryptedEnvelope) {
    super('A senha-mestra foi alterada em outro dispositivo');
  }
}

/**
 * Sincroniza o cofre local com o Drive e retorna o cofre resultante (já
 * mesclado). `changed` indica se o merge alterou o estado local.
 */
/**
 * `rekey` (troca de senha-mestra): o merge usa a chave atual (`ctx`), mas o
 * resultado sobe cifrado com a nova chave/salt.
 */
export async function syncWithDrive(
  local: Vault,
  ctx: SyncContext,
  rekey?: Pick<SyncContext, 'key' | 'kdf'>,
): Promise<SyncResult> {
  const remoteEnvelope = await downloadVault(ctx.token);

  let merged = normalizeVault(local);
  if (remoteEnvelope) {
    try {
      const plaintext = await decryptWithKey(ctx.key, remoteEnvelope.iv, remoteEnvelope.ct);
      const remote = normalizeVault(JSON.parse(plaintext) as Vault);
      merged = mergeVaults(merged, remote);
    } catch {
      throw new RemoteKeyMismatchError(remoteEnvelope);
    }
  }

  const localJson = JSON.stringify(normalizeVault(local));
  const mergedJson = JSON.stringify(merged);
  const changed = mergedJson !== localJson;

  // Reenvia sempre que houver remoto inexistente/desatualizado ou merge novo
  const target = rekey ?? ctx;
  const { iv, ct } = await encryptWithKey(target.key, mergedJson);
  await uploadVault(ctx.token, envelopeFrom(target.kdf, iv, ct));

  return { vault: merged, changed };
}
