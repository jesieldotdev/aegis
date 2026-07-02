import { base32Decode } from './base32';

export type ParsedOtp = {
  issuer: string;
  account: string;
  secret: string;
};

/** Valida se a string é um segredo base32 plausível. */
export function isValidSecret(input: string): boolean {
  const clean = input.replace(/[\s-]/g, '');
  if (clean.length < 8) return false;
  try {
    base32Decode(clean);
    return true;
  } catch {
    return false;
  }
}

/**
 * Interpreta a entrada de um novo token 2FA: aceita uma URI
 * `otpauth://totp/Emissor:conta?secret=…&issuer=…` (conteúdo típico de
 * QR Code) ou um segredo base32 puro. Retorna null se inválido.
 */
export function parseOtpAuth(input: string): ParsedOtp | null {
  const trimmed = input.trim();

  if (/^otpauth:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.host.toLowerCase() !== 'totp') return null;
      const secret = (url.searchParams.get('secret') ?? '').replace(/[\s-]/g, '');
      if (!isValidSecret(secret)) return null;
      const label = decodeURIComponent(url.pathname.replace(/^\//, ''));
      const [labelIssuer, labelAccount] = label.includes(':')
        ? [label.slice(0, label.indexOf(':')), label.slice(label.indexOf(':') + 1)]
        : ['', label];
      const issuer = url.searchParams.get('issuer') ?? labelIssuer;
      return { issuer: issuer.trim(), account: labelAccount.trim(), secret: secret.toUpperCase() };
    } catch {
      return null;
    }
  }

  if (isValidSecret(trimmed)) {
    return { issuer: '', account: '', secret: trimmed.replace(/[\s-]/g, '').toUpperCase() };
  }

  return null;
}
