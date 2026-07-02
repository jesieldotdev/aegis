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
};

export type TotpToken = {
  id: string;
  issuer: string;
  account: string;
  /** Segredo em base32 (RFC 4648). */
  secret: string;
};

export type VaultProfile = {
  name: string;
};

export type Vault = {
  profile: VaultProfile;
  credentials: Credential[];
  tokens: TotpToken[];
};
