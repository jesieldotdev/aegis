export type Category = 'Pessoal' | 'Trabalho' | 'Financeiro';

export type Credential = {
  id: string;
  name: string;
  domain: string;
  username: string;
  /** Em repouso, o cofre inteiro é cifrado (AES-256-GCM). */
  password: string;
  category: Category;
  passkey: boolean;
  /** Segredo TOTP em base32 (RFC 4648). Presença implica 2FA vinculado. */
  totpSecret?: string;
  notes?: string;
  /** Epoch ms da última alteração — usado no merge de sincronização (LWW). */
  updatedAt: number;
};

export type TotpToken = {
  id: string;
  issuer: string;
  account: string;
  /** Segredo em base32 (RFC 4648). */
  secret: string;
  /** Epoch ms da última alteração — usado no merge de sincronização (LWW). */
  updatedAt: number;
};

/** Paleta de cores das notas (estilo Keep), adaptada ao tema escuro. */
export type NoteColor = 'default' | 'rose' | 'amber' | 'green' | 'teal' | 'blue' | 'purple';

export const NOTE_COLORS: NoteColor[] = ['default', 'rose', 'amber', 'green', 'teal', 'blue', 'purple'];

export type Note = {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  pinned: boolean;
  /** Epoch ms da última alteração — usado no merge de sincronização (LWW). */
  updatedAt: number;
};

export type VaultProfile = {
  name: string;
};

/**
 * Lápides de exclusão: mapeiam a chave do item ("c:<id>" para credenciais,
 * "t:<id>" para tokens) ao epoch ms da exclusão. Permitem propagar deleções
 * entre dispositivos sem "ressuscitar" itens no merge.
 */
export type Tombstones = Record<string, number>;

export type Vault = {
  profile: VaultProfile;
  credentials: Credential[];
  tokens: TotpToken[];
  notes: Note[];
  tombstones: Tombstones;
  /** Epoch ms da última mutação local (desempata o profile no merge). */
  updatedAt: number;
};

export function credKey(id: string): string {
  return `c:${id}`;
}

export function tokenKey(id: string): string {
  return `t:${id}`;
}

export function noteKey(id: string): string {
  return `n:${id}`;
}
