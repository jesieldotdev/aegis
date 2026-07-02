import { Avatar, CountdownRing, IconQrPlus, ringColor } from '@aegis/ui';
import { AVATAR_STYLES, type TotpToken } from '@aegis/core';
import { useApp } from '../store';
import { useNow, useTotp } from '../hooks';

function TokenCard({ token, now }: { token: TotpToken; now: number }) {
  const { copy } = useApp();
  const totp = useTotp(token.secret, now);
  const avatar = AVATAR_STYLES[token.id] ?? { color: 'var(--accent-grad)', initial: token.issuer[0] };
  const color = ringColor(totp.remaining);
  const expiring = totp.remaining <= 5;

  return (
    <button type="button" className="token-card" onClick={() => copy('Código', totp.code.replace(' ', ''))}>
      <Avatar color={avatar.color} initial={avatar.initial} size={44} fontSize={18} shadow={false} />
      <div className="token-body">
        <div className="token-issuer">{token.issuer}</div>
        <div className={`token-code${expiring ? ' token-code--expiring' : ''}`}>{totp.code}</div>
      </div>
      <CountdownRing size={42} frac={totp.frac} remaining={totp.remaining} color={color} strokeWidth={3.4} fontSize={14} />
    </button>
  );
}

export function Authenticator() {
  const { vault } = useApp();
  const now = useNow();

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Autenticador</div>
        <div className="screen-subtitle">Códigos de verificação em tempo real</div>
      </div>
      <div className="auth-list">
        {vault.tokens.map((t) => (
          <TokenCard key={t.id} token={t} now={now} />
        ))}
        <button type="button" className="auth-scan">
          <IconQrPlus size={18} />
          Escanear QR Code
        </button>
      </div>
    </div>
  );
}
