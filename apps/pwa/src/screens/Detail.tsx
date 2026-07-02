import {
  Avatar,
  CountdownRing,
  IconChevronLeft,
  IconClock,
  IconCopy,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconKebab,
  IconShare,
  ringColor,
} from '@aegis/ui';
import { avatarFor, estimateStrength, strengthMeta, totpCounter } from '@aegis/core';
import { useApp } from '../store';
import { useNow, useTotp } from '../hooks';

export function Detail() {
  const { vault, detailId, back, revealed, toggleReveal, copy, share, openEdit, deleteCredential } = useApp();
  const item = vault?.credentials.find((c) => c.id === detailId);
  const now = useNow(!!item?.totpSecret);
  const totp = useTotp(item?.totpSecret, now);

  if (!item) return null;

  const meta = strengthMeta(estimateStrength(item.password));
  const avatar = avatarFor(item.id, item.name);
  const color = ringColor(totp.remaining);

  const removeItem = () => {
    if (window.confirm(`Excluir "${item.name}" do cofre?`)) deleteCredential(item.id);
  };

  return (
    <div className="screen screen--scroll screen--slide">
      <div className="detail-nav">
        <button type="button" className="icon-btn" onClick={back} aria-label="Voltar">
          <IconChevronLeft size={19} />
        </button>
        <button type="button" className="icon-btn" onClick={removeItem} aria-label="Excluir item">
          <IconKebab size={18} />
        </button>
      </div>

      <div className="detail-hero">
        <Avatar color={avatar.color} initial={avatar.initial} size={74} radius={21} fontSize={31} />
        <div className="detail-name">{item.name}</div>
        <div className="detail-domain">{item.domain}</div>
      </div>

      <div className="detail-fields">
        <div
          className="field-card field-card--row"
          role="button"
          tabIndex={0}
          onClick={() => copy('Usuário', item.username)}
          onKeyDown={(e) => e.key === 'Enter' && copy('Usuário', item.username)}
        >
          <div style={{ minWidth: 0 }}>
            <div className="field-label">Usuário</div>
            <div className="field-value">{item.username}</div>
          </div>
          <IconCopy size={19} style={{ color: '#9a9aad', flex: '0 0 auto' }} />
        </div>

        <div className="field-card field-card--row" style={{ cursor: 'default' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="field-label">Senha</div>
            <div className="field-value field-value--mono">
              {revealed ? item.password : '•'.repeat(item.password.length)}
            </div>
          </div>
          <div className="field-actions">
            <button
              type="button"
              className="mini-btn"
              onClick={toggleReveal}
              aria-label={revealed ? 'Ocultar senha' : 'Revelar senha'}
            >
              {revealed ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
            <button
              type="button"
              className="mini-btn mini-btn--accent"
              onClick={() => copy('Senha', item.password)}
              aria-label="Copiar senha"
            >
              <IconCopy size={18} />
            </button>
          </div>
        </div>

        <div className="field-card">
          <div className="strength-row">
            <span className="strength-title">Força da senha</span>
            <span className="strength-label" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </div>
          <div className="strength-bars">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="strength-bar"
                style={meta.bars >= n ? { background: meta.color } : undefined}
              />
            ))}
          </div>
        </div>

        {item.totpSecret && (
          <button
            type="button"
            className="totp-card"
            onClick={() => copy('Código 2FA', totp.code.replace(' ', ''))}
          >
            <div className="totp-card-left">
              <IconClock size={22} style={{ color: '#8ba6f0' }} />
              <div>
                <div className="field-label" style={{ color: 'var(--text-dim)' }}>
                  Código 2FA
                </div>
                <div className="totp-card-code">{totp.code}</div>
              </div>
            </div>
            <CountdownRing
              size={34}
              frac={totp.frac}
              remaining={totp.remaining}
              color={color}
              periodKey={totpCounter(now)}
            />
          </button>
        )}

        {item.notes && (
          <div className="field-card">
            <div className="field-label">Notas</div>
            <div className="field-value" style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</div>
          </div>
        )}

        <div className="detail-actions">
          <button type="button" className="action-btn" onClick={() => openEdit(item.id)}>
            <IconEdit size={17} />
            Editar
          </button>
          <button type="button" className="action-btn" onClick={() => share(item)}>
            <IconShare size={17} />
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}
