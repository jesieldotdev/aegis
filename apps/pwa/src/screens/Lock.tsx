import { AegisLogo, IconFingerprint, IconPadlock } from '@aegis/ui';
import { useApp } from '../store';

export function Lock() {
  const { scanning, unlock } = useApp();

  return (
    <div className="lock">
      <AegisLogo size={96} iconSize={46} radius={28} />
      <div className="lock-name">Aegis</div>
      <div className="lock-subtitle">Seu cofre está bloqueado e protegido</div>

      <button type="button" className={`lock-bio${scanning ? ' lock-bio--scanning' : ''}`} onClick={unlock}>
        <div className="lock-bio-face">
          {scanning && <div className="lock-bio-scanline" />}
          <IconFingerprint size={44} />
        </div>
        <div className="lock-bio-label">{scanning ? 'Verificando…' : 'Toque para desbloquear'}</div>
      </button>

      <div className="lock-footer">
        <IconPadlock size={14} />
        Desbloqueio biométrico ativado
      </div>
    </div>
  );
}
