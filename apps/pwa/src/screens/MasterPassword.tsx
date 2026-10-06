import { useState, type FormEvent } from 'react';
import { IconChevronLeft, IconEye, IconEyeOff } from '@aegis/ui';
import { estimateStrength, strengthMeta } from '@aegis/core';
import { useApp } from '../store';

/**
 * Senha-mestra:
 * - 'change': troca a senha (pede a atual). Com Drive conectado, o cofre do
 *   Drive é re-cifrado junto — os outros dispositivos passam a pedir a nova.
 * - 'adopt': a senha foi trocada em outro dispositivo; digita-se a nova para
 *   este aparelho voltar a sincronizar.
 */
export function MasterPassword() {
  const { passwordScreen, closePasswordScreen, changeMasterPassword, adoptRemotePassword, google } = useApp();
  const adopt = passwordScreen === 'adopt';
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const meta = !adopt && password ? strengthMeta(estimateStrength(password)) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (adopt) {
      if (!password) return setError('Digite a nova senha-mestra');
    } else {
      if (!current) return setError('Digite a senha atual');
      if (password.length < 8) return setError('A senha-mestra precisa de pelo menos 8 caracteres');
      if (password !== confirm) return setError('As senhas não coincidem');
      if (password === current) return setError('A nova senha é igual à atual');
    }
    setError('');
    setBusy(true);
    try {
      const err = adopt ? await adoptRemotePassword(password) : await changeMasterPassword(current, password);
      if (err) setError(err);
    } finally {
      setBusy(false);
    }
  };

  const eye = (
    <button type="button" className="mini-btn" onClick={() => setShow((s) => !s)} aria-label="Mostrar senha">
      {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
    </button>
  );

  return (
    <div className="screen screen--scroll screen--slide">
      <div className="detail-nav">
        <button type="button" className="icon-btn" onClick={closePasswordScreen} aria-label="Cancelar">
          <IconChevronLeft size={19} />
        </button>
        <div className="screen-title" style={{ fontSize: 19 }}>
          {adopt ? 'Atualizar senha-mestra' : 'Alterar senha-mestra'}
        </div>
        <div style={{ width: 40 }} />
      </div>

      <form className="detail-fields" style={{ paddingTop: 18 }} onSubmit={submit}>
        <div className="mp-note">
          {adopt
            ? 'A senha-mestra deste cofre foi alterada em outro dispositivo. Digite a nova senha para voltar a sincronizar — nada deste aparelho é perdido.'
            : google.account
              ? 'O cofre deste aparelho e o do Google Drive serão re-cifrados com a nova senha. Nos outros dispositivos e na extensão, use a nova senha a partir de agora.'
              : 'O cofre será re-cifrado com a nova senha. Ela não pode ser recuperada — guarde-a bem.'}
        </div>

        {!adopt && (
          <div className="field-card">
            <label className="field-label" htmlFor="mp-current">Senha atual</label>
            <div className="ed-pass-row">
              <input
                id="mp-current"
                className="ed-input"
                type={show ? 'text' : 'password'}
                value={current}
                onChange={(e) => { setCurrent(e.target.value); setError(''); }}
                autoComplete="current-password"
              />
              {eye}
            </div>
          </div>
        )}

        <div className="field-card">
          <label className="field-label" htmlFor="mp-new">{adopt ? 'Nova senha-mestra' : 'Nova senha'}</label>
          <div className="ed-pass-row">
            <input
              id="mp-new"
              className="ed-input"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder={adopt ? 'Definida no outro dispositivo' : 'Mínimo 8 caracteres'}
              autoComplete={adopt ? 'current-password' : 'new-password'}
            />
            {adopt && eye}
          </div>
          {meta && (
            <div className="ob-strength">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="strength-bar" style={meta.bars >= n ? { background: meta.color } : undefined} />
              ))}
            </div>
          )}
        </div>

        {!adopt && (
          <div className="field-card">
            <label className="field-label" htmlFor="mp-confirm">Confirmar nova senha</label>
            <input
              id="mp-confirm"
              className="ed-input"
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              autoComplete="new-password"
            />
          </div>
        )}

        {error && <div className="ob-error">{error}</div>}

        <div className="detail-actions">
          <button type="button" className="action-btn" onClick={closePasswordScreen}>Cancelar</button>
          <button type="submit" className="action-btn action-btn--primary" disabled={busy}>
            {busy ? 'Cifrando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
