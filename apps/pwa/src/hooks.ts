import { useEffect, useState } from 'react';
import { formatTotp, generateTotp, TOTP_PERIOD, totpCounter, totpRemaining } from '@aegis/core';

/** Timestamp atual com tick de 250ms — dirige os anéis TOTP. */
export function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

export type TotpView = {
  /** Código formatado "978 849" (vazio enquanto calcula). */
  code: string;
  remaining: number;
  frac: number;
};

/** Código TOTP ao vivo para um segredo base32; recalcula a cada período de 30s. */
export function useTotp(secret: string | undefined, now: number): TotpView {
  const counter = totpCounter(now);
  const [code, setCode] = useState('');
  useEffect(() => {
    if (!secret) return;
    let cancelled = false;
    generateTotp(secret, now)
      .then((c) => {
        if (!cancelled) setCode(formatTotp(c));
      })
      .catch(() => {
        if (!cancelled) setCode('——— ———');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret, counter]);

  const remaining = totpRemaining(now);
  return { code, remaining, frac: remaining / TOTP_PERIOD };
}
