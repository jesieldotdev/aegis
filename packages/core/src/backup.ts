import { decrypt, encrypt, type EncryptedEnvelope } from './crypto';
import type { Vault } from './types';

export type AegisBackupFile = {
  format: 'aegis-backup';
  exportedAt: string; // ISO 8601
  data: EncryptedEnvelope;
};

/** Serializa e cifra o cofre em um arquivo .aegis (JSON). */
export async function exportVault(vault: Vault, masterPassword: string): Promise<string> {
  const data = await encrypt(JSON.stringify(vault), masterPassword);
  const file: AegisBackupFile = {
    format: 'aegis-backup',
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(file, null, 2);
}

/** Lê e decifra um arquivo .aegis. Lança erro se a senha ou o formato forem inválidos. */
export async function importVault(fileContents: string, masterPassword: string): Promise<Vault> {
  const parsed = JSON.parse(fileContents) as AegisBackupFile;
  if (parsed.format !== 'aegis-backup') throw new Error('Arquivo .aegis inválido');
  const plaintext = await decrypt(parsed.data, masterPassword);
  return JSON.parse(plaintext) as Vault;
}
