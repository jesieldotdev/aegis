import type { Credential, TotpToken, Vault } from './types';

/**
 * Dados de exemplo opcionais (oferecidos no onboarding para popular o cofre).
 * Nomes/domínios de marcas são apenas rótulos de exemplo.
 * Segredos TOTP são base32 válido (RFC 4648) — gerados para a demo.
 */

export const DEMO_CREDENTIALS: Credential[] = [
  {
    id: 'google', name: 'Google', domain: 'accounts.google.com',
    username: 'marina.souza@gmail.com', password: 'Xt9$mK2pLq7@vNw4',
    category: 'Pessoal', passkey: true,
    totpSecret: 'JBSWY3DPEHPK3PXP',
  },
  {
    id: 'github', name: 'GitHub', domain: 'github.com',
    username: 'marina-dev', password: 'Rk8#nZ4wPx2!mBq9',
    category: 'Trabalho', passkey: false,
    totpSecret: 'GEZDGNBVGY3TQOJQ',
  },
  {
    id: 'nubank', name: 'Nubank', domain: 'nubank.com.br',
    username: 'marina.souza@gmail.com', password: 'Pw7&kT3nRj9@xLm2',
    category: 'Financeiro', passkey: false,
    totpSecret: 'MFRGGZDFMZTWQ2LK',
  },
  {
    id: 'figma', name: 'Figma', domain: 'figma.com',
    username: 'marina@studio.co', password: 'Zt4$pW9kNx2!vRm7',
    category: 'Trabalho', passkey: true,
  },
  {
    id: 'netflix', name: 'Netflix', domain: 'netflix.com',
    username: 'familia.souza@gmail.com', password: 'netflix2024',
    category: 'Pessoal', passkey: false,
  },
  {
    id: 'spotify', name: 'Spotify', domain: 'spotify.com',
    username: 'marina.souza', password: 'Music!Lover88',
    category: 'Pessoal', passkey: false,
  },
  {
    id: 'amazon', name: 'Amazon', domain: 'amazon.com.br',
    username: 'marina.souza@gmail.com', password: 'marina123',
    category: 'Pessoal', passkey: false,
  },
  {
    id: 'instagram', name: 'Instagram', domain: 'instagram.com',
    username: '@marina.souza', password: 'Qw8#rY5tHn3!kMp6',
    category: 'Pessoal', passkey: false,
    totpSecret: 'ONSWG4TFOQQGM2LH',
  },
  {
    id: 'acme', name: 'Acme Bank', domain: 'acmebank.com.br',
    username: 'marina.souza@gmail.com', password: 'Vb6@jH8sQd3!wPk5',
    category: 'Financeiro', passkey: false,
  },
];

export const DEMO_TOKENS: TotpToken[] = [
  { id: 'google', issuer: 'Google', account: 'marina.souza@gmail.com', secret: 'JBSWY3DPEHPK3PXP' },
  { id: 'github', issuer: 'GitHub', account: 'marina-dev', secret: 'GEZDGNBVGY3TQOJQ' },
  { id: 'nubank', issuer: 'Nubank', account: 'marina.souza', secret: 'MFRGGZDFMZTWQ2LK' },
  { id: 'instagram', issuer: 'Instagram', account: '@marina.souza', secret: 'ONSWG4TFOQQGM2LH' },
  { id: 'binance', issuer: 'Binance', account: 'marina.souza@gmail.com', secret: 'MZXW6YTBOJRGK6TT' },
];

export function demoVault(profileName: string): Vault {
  return {
    profile: { name: profileName },
    credentials: DEMO_CREDENTIALS,
    tokens: DEMO_TOKENS,
  };
}

export const DEMO_VAULT: Vault = demoVault('Marina Souza');
