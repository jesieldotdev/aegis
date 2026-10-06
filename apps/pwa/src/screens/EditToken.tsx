import { useState, type FormEvent } from 'react';
import { IconChevronLeft } from '@aegis/ui';
import { parseOtpAuth } from '@aegis/core';
import { useApp } from '../store';

/**
 * Edição de um token 2FA existente: emissor, conta e segredo. O segredo
 * aceita base32 ou uma URI otpauth:// (útil para trocar a chave depois de
 * reconfigurar o 2FA no serviço).
 */
export function EditToken() {
  const { vault, editingTokenId, closeEditToken, updateToken, deleteToken } = useApp();
  const existing = vault?.tokens.find((t) => t.id === editingTokenId);
  const [issuer, setIssuer] = useState(existing?.issuer ?? '');
  const [account, setAccount] = useState(existing?.account ?? '');
  const [secretInput, setSecretInput] = useState(existing?.secret ?? '');
  const [error, setError] = useState('');

  if (!existing) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseOtpAuth(secretInput);
    if (!parsed) return setError('Segredo inválido (base32 ou URI otpauth://)');
    const finalIssuer = issuer.trim() || parsed.issuer;
    if (!finalIssuer) return setError('Informe o emissor (ex.: Google)');
    updateToken({
      ...existing,
      issuer: finalIssuer,
      account: account.trim() || parsed.account,
      secret: parsed.secret,
    });
  };

  const remove = () => {
    if (window.confirm(`Remover o token de ${existing.issuer}?`)) deleteToken(existing.id);
  };

  return (
    <div className="screen screen--scroll screen--slide">
      <div className="detail-nav">
        <button type="button" className="icon-btn" onClick={closeEditToken} aria-label="Cancelar">
          <IconChevronLeft size={19} />
        </button>
        <div className="screen-title" style={{ fontSize: 19 }}>Editar 2FA</div>
        <div style={{ width: 40 }} />
      </div>

      <form className="detail-fields" style={{ paddingTop: 18 }} onSubmit={submit}>
        <div className="field-card">
          <label className="field-label" htmlFor="et-issuer">Emissor</label>
          <input id="et-issuer" className="ed-input" value={issuer} onChange={(e) => { setIssuer(e.target.value); setError(''); }} placeholder="Ex.: Google" />
        </div>
        <div className="field-card">
          <label className="field-label" htmlFor="et-account">Conta</label>
          <input id="et-account" className="ed-input" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Ex.: voce@email.com" autoCapitalize="none" />
        </div>
        <div className="field-card">
          <label className="field-label" htmlFor="et-secret">Segredo ou URI</label>
          <input
            id="et-secret"
            className="ed-input ed-input--mono"
            value={secretInput}
            onChange={(e) => { setSecretInput(e.target.value); setError(''); }}
            placeholder="JBSWY3DP… ou otpauth://totp/…"
            autoCapitalize="none"
          />
        </div>

        {error && <div className="ob-error">{error}</div>}

        <div className="detail-actions">
          <button type="button" className="action-btn" onClick={closeEditToken}>Cancelar</button>
          <button type="submit" className="action-btn action-btn--primary">Salvar</button>
        </div>

        <button type="button" className="set-lock-btn" style={{ marginTop: 4 }} onClick={remove}>
          Remover token
        </button>
      </form>
    </div>
  );
}
