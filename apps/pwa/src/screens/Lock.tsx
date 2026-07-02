import { useState, type FormEvent } from 'react';
import { AegisLogo, IconArrowRight, IconFingerprint, IconPadlock } from '@aegis/ui';
import { useApp } from '../store';

export function Lock() {
  const { scanning, bioReady, unlockError, unlockWithPassword, unlockWithBiometric, clearUnlockError } = useApp();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(!bioReady);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    const ok = await unlockWithPassword(password);
    setBusy(false);
    if (!ok) setPassword('');
  };

  return (
    <div className="lock">
      <AegisLogo size={96} iconSize={46} radius={28} />
      <div className="lock-name">Aegis</div>
      <div className="lock-subtitle">Seu cofre está bloqueado e protegido</div>

      {bioReady && !showPassword ? (
        <>
          <button
            type="button"
            className={`lock-bio${scanning ? ' lock-bio--scanning' : ''}`}
            onClick={unlockWithBiometric}
          >
            <div className="lock-bio-face">
              {scanning && <div className="lock-bio-scanline" />}
              <IconFingerprint size={44} />
            </div>
            <div className="lock-bio-label">{scanning ? 'Verificando…' : 'Toque para desbloquear'}</div>
          </button>
          <button type="button" className="lock-alt" onClick={() => setShowPassword(true)}>
            Usar senha-mestra
          </button>
        </>
      ) : (
        <form className="lock-form" onSubmit={submit}>
          <div className="ob-input ob-input--row">
            <IconPadlock size={16} style={{ color: '#7b7b8c', flex: '0 0 auto' }} />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearUnlockError(); }}
              placeholder="Senha-mestra"
              autoComplete="current-password"
              autoFocus
            />
            <button type="submit" className="lock-go" disabled={busy || !password} aria-label="Desbloquear">
              <IconArrowRight size={16} />
            </button>
          </div>
          {busy && <div className="lock-hint lock-hint--busy">Derivando chave…</div>}
          {bioReady && !busy && (
            <button type="button" className="lock-alt" onClick={() => { setShowPassword(false); clearUnlockError(); }}>
              Usar biometria
            </button>
          )}
        </form>
      )}

      {unlockError && <div className="ob-error" style={{ marginTop: 14 }}>{unlockError}</div>}

      <div className="lock-footer">
        <IconPadlock size={14} />
        {bioReady ? 'Desbloqueio biométrico ativado' : 'Protegido por senha-mestra'}
      </div>
    </div>
  );
}
