import type { CSSProperties } from 'react';
import { Avatar, CountdownRing, IconQrPlus, ringColor } from '@aegis/ui';
import { avatarFor, totpCounter, type TotpToken } from '@aegis/core';
import { useApp } from '../store';
import { useNow, useTotp } from '../hooks';

function TokenCard({ token, now, index }: { token: TotpToken; now: number; index: number }) {
  const { copy } = useApp();
  const totp = useTotp(token.secret, now);
  const avatar = avatarFor(token.id, token.issuer);
  const color = ringColor(totp.remaining);
  const expiring = totp.remaining <= 5;

  return (
    <button
      type="button"
      className="token-card"
      style={{ '--i': index } as CSSProperties}
      onClick={() => copy('Código', totp.code.replace(' ', ''))}
    >
      <Avatar color={avatar.color} initial={avatar.initial} size={44} fontSize={18} shadow={false} />
      <div className="token-body">
        <div className="token-issuer">{token.issuer}</div>
        <div className={`token-code${expiring ? ' token-code--expiring' : ''}`}>{totp.code}</div>
      </div>
      <CountdownRing
        size={42}
        frac={totp.frac}
        remaining={totp.remaining}
        color={color}
        strokeWidth={3.4}
        fontSize={14}
        periodKey={totpCounter(now)}
      />
    </button>
  );
}

export function Authenticator() {
  const { vault, openAddToken } = useApp();
  const now = useNow();
  if (!vault) return null;

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Autenticador</div>
        <div className="screen-subtitle">Códigos de verificação em tempo real</div>
      </div>
      <div className="auth-list">
        {vault.tokens.map((t, i) => (
          <TokenCard key={t.id} token={t} now={now} index={i} />
        ))}
        {vault.tokens.length === 0 && (
          <div className="vault-empty">Nenhum token — escaneie um QR Code para começar</div>
        )}
        <button type="button" className="auth-scan" onClick={openAddToken}>
          <IconQrPlus size={18} />
          Escanear QR Code
        </button>
      </div>
    </div>
  );
}
