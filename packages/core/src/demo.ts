import type { Credential, TotpToken, Vault } from './types';

/**
 * Dados de demonstração (o protótipo não tem backend).
 * Nomes/domínios de marcas são apenas rótulos de exemplo.
 * Segredos TOTP são base32 válido (RFC 4648) — gerados para a demo.
 */

export type AvatarStyle = { color: string; initial: string };

export const AVATAR_STYLES: Record<string, AvatarStyle> = {
  google: { color: 'linear-gradient(145deg,#4285F4,#1a56c4)', initial: 'G' },
  github: { color: 'linear-gradient(145deg,#3a3f47,#16181d)', initial: 'Gh' },
  nubank: { color: 'linear-gradient(145deg,#a05fe6,#7211a8)', initial: 'Nu' },
  figma: { color: 'linear-gradient(145deg,#f24e1e,#c43410)', initial: 'Fi' },
  netflix: { color: 'linear-gradient(145deg,#e50914,#8a0009)', initial: 'N' },
  spotify: { color: 'linear-gradient(145deg,#1db954,#0a7d38)', initial: 'Sp' },
  amazon: { color: 'linear-gradient(145deg,#ff9900,#c46f00)', initial: 'Az' },
  instagram: { color: 'linear-gradient(145deg,#e1306c,#833ab4)', initial: 'Ig' },
  binance: { color: 'linear-gradient(145deg,#f0b90b,#a37c00)', initial: 'Bn' },
  acme: { color: 'linear-gradient(145deg,#2563eb,#1e40af)', initial: 'A' },
};

export const DEMO_CREDENTIALS: Credential[] = [
  {
    id: 'google', name: 'Google', domain: 'accounts.google.com',
    username: 'marina.souza@gmail.com', password: 'Xt9$mK2pLq7@vNw4',
    category: 'Pessoal', strength: 'strong', passkey: true, has2fa: true,
    totpSecret: 'JBSWY3DPEHPK3PXP',
  },
  {
    id: 'github', name: 'GitHub', domain: 'github.com',
    username: 'marina-dev', password: 'Rk8#nZ4wPx2!mBq9',
    category: 'Trabalho', strength: 'strong', passkey: false, has2fa: true,
    totpSecret: 'GEZDGNBVGY3TQOJQ',
  },
  {
    id: 'nubank', name: 'Nubank', domain: 'nubank.com.br',
    username: 'marina.souza@gmail.com', password: 'Pw7&kT3nRj9@xLm2',
    category: 'Financeiro', strength: 'strong', passkey: false, has2fa: true,
    totpSecret: 'MFRGGZDFMZTWQ2LK',
  },
  {
    id: 'figma', name: 'Figma', domain: 'figma.com',
    username: 'marina@studio.co', password: 'Zt4$pW9kNx2!vRm7',
    category: 'Trabalho', strength: 'strong', passkey: true, has2fa: false,
  },
  {
    id: 'netflix', name: 'Netflix', domain: 'netflix.com',
    username: 'familia.souza@gmail.com', password: 'netflix2024',
    category: 'Pessoal', strength: 'medium', passkey: false, has2fa: false,
  },
  {
    id: 'spotify', name: 'Spotify', domain: 'spotify.com',
    username: 'marina.souza', password: 'Music!Lover88',
    category: 'Pessoal', strength: 'medium', passkey: false, has2fa: false,
  },
  {
    id: 'amazon', name: 'Amazon', domain: 'amazon.com.br',
    username: 'marina.souza@gmail.com', password: 'marina123',
    category: 'Pessoal', strength: 'weak', passkey: false, has2fa: false,
  },
  {
    id: 'instagram', name: 'Instagram', domain: 'instagram.com',
    username: '@marina.souza', password: 'Qw8#rY5tHn3!kMp6',
    category: 'Pessoal', strength: 'strong', passkey: false, has2fa: true,
    totpSecret: 'ONSWG4TFOQQGM2LH',
  },
  {
    id: 'acme', name: 'Acme Bank', domain: 'acmebank.com.br',
    username: 'marina.souza@gmail.com', password: 'Vb6@jH8sQd3!wPk5',
    category: 'Financeiro', strength: 'strong', passkey: false, has2fa: false,
  },
];

export const DEMO_TOKENS: TotpToken[] = [
  { id: 'google', issuer: 'Google', account: 'marina.souza@gmail.com', secret: 'JBSWY3DPEHPK3PXP' },
  { id: 'github', issuer: 'GitHub', account: 'marina-dev', secret: 'GEZDGNBVGY3TQOJQ' },
  { id: 'nubank', issuer: 'Nubank', account: 'marina.souza', secret: 'MFRGGZDFMZTWQ2LK' },
  { id: 'instagram', issuer: 'Instagram', account: '@marina.souza', secret: 'ONSWG4TFOQQGM2LH' },
  { id: 'binance', issuer: 'Binance', account: 'marina.souza@gmail.com', secret: 'MZXW6YTBOJRGK6TT' },
];

export const DEMO_VAULT: Vault = {
  credentials: DEMO_CREDENTIALS,
  tokens: DEMO_TOKENS,
};

export const DEMO_USER = {
  name: 'Marina Souza',
  firstName: 'Marina',
  email: 'marina.souza@gmail.com',
  initial: 'M',
};
