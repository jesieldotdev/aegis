export type Category = 'Pessoal' | 'Trabalho' | 'Financeiro';

export type Strength = 'strong' | 'medium' | 'weak';

export type Credential = {
  id: string;
  name: string;
  domain: string;
  username: string;
  /** Em produção, cifrado em repouso dentro do cofre (AES-256-GCM). */
  password: string;
  category: Category;
  strength: Strength;
  passkey: boolean;
  has2fa: boolean;
  /** Segredo TOTP em base32 (RFC 4648), cifrado em repouso. */
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

export type Vault = {
  credentials: Credential[];
  tokens: TotpToken[];
};
