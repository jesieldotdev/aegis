import { base32Decode } from './base32';

export const TOTP_PERIOD = 30;
export const TOTP_DIGITS = 6;

/**
 * Gera um código TOTP (RFC 6238): HMAC-SHA1, período de 30s, 6 dígitos.
 * O segredo é uma string base32 (RFC 4648).
 */
export async function generateTotp(
  secret: string,
  timestampMs: number = Date.now(),
  period: number = TOTP_PERIOD,
  digits: number = TOTP_DIGITS,
): Promise<string> {
  const counter = Math.floor(timestampMs / 1000 / period);
  const key = base32Decode(secret);

  // Contador de 8 bytes big-endian (RFC 4226)
  const msg = new Uint8Array(8);
  const view = new DataView(msg.buffer);
  view.setUint32(4, counter >>> 0);
  view.setUint32(0, Math.floor(counter / 2 ** 32));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, msg));

  // Truncamento dinâmico (RFC 4226 §5.3)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];

  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

/** Segundos restantes até o próximo período TOTP. */
export function totpRemaining(timestampMs: number = Date.now(), period: number = TOTP_PERIOD): number {
  return period - (Math.floor(timestampMs / 1000) % period);
}

/** Contador atual do período (muda a cada 30s) — útil como chave de recomputação. */
export function totpCounter(timestampMs: number = Date.now(), period: number = TOTP_PERIOD): number {
  return Math.floor(timestampMs / 1000 / period);
}

/** Formata "978849" como "978 849". */
export function formatTotp(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}
