import {
  IconChevronRight,
  IconClock,
  IconCloudUpload,
  IconDownload,
  IconFingerprint,
  IconGoogle,
  IconPadlock,
  Toggle,
} from '@aegis/ui';
import { useApp } from '../store';

export function Settings() {
  const { user, bio, backup, toggleBio, toggleBackup, doExport, lock } = useApp();

  return (
    <div className="screen screen--scroll">
      <div className="screen-header">
        <div className="screen-title">Ajustes</div>
      </div>

      <div className="set-body">
        <div className="set-account">
          <div className="set-account-avatar">{user.initial}</div>
          <div style={{ flex: 1 }}>
            <div className="set-account-name">{user.name}</div>
            <div className="set-account-google">
              <IconGoogle size={14} />
              Conectado com Google
            </div>
          </div>
          <span className="online-dot" />
        </div>

        <div>
          <div className="set-section-title">Segurança</div>
          <div className="set-group">
            <div className="set-row">
              <div className="set-row-icon" style={{ background: 'rgba(52,211,153,.16)', color: 'var(--success)' }}>
                <IconFingerprint size={18} strokeWidth={1.7} />
              </div>
              <div className="set-row-body">
                <div className="set-row-title">Desbloqueio biométrico</div>
                <div className="set-row-sub">Digital ou reconhecimento facial</div>
              </div>
              <Toggle on={bio} onToggle={toggleBio} variant="success" />
            </div>
            <div className="set-row set-row--click">
              <div className="set-row-icon" style={{ background: 'rgba(139,92,246,.16)', color: 'var(--accent)' }}>
                <IconClock size={18} />
              </div>
              <div className="set-row-body">
                <div className="set-row-title">Bloqueio automático</div>
                <div className="set-row-sub">Após 1 minuto inativo</div>
              </div>
              <IconChevronRight size={17} style={{ color: '#54546a' }} />
            </div>
          </div>
        </div>

        <div>
          <div className="set-section-title">Backup &amp; Sincronização</div>
          <div className="set-group">
            <div className="set-row">
              <div className="set-row-icon" style={{ background: 'rgba(94,123,230,.16)', color: '#7ea0f0' }}>
                <IconCloudUpload size={18} />
              </div>
              <div className="set-row-body">
                <div className="set-row-title">Backup criptografado</div>
                <div className="set-row-sub set-row-sub--success">Último: hoje, 08:42</div>
              </div>
              <Toggle on={backup} onToggle={toggleBackup} />
            </div>
            <div className="set-row set-row--click" onClick={doExport}>
              <div className="set-row-icon" style={{ background: 'rgba(255,255,255,.06)', color: '#c1c1cf' }}>
                <IconDownload size={18} />
              </div>
              <div className="set-row-body">
                <div className="set-row-title">Exportar cofre</div>
                <div className="set-row-sub">Arquivo .aegis criptografado</div>
              </div>
              <IconChevronRight size={17} style={{ color: '#54546a' }} />
            </div>
          </div>
        </div>

        <button type="button" className="set-lock-btn" onClick={lock}>
          <IconPadlock size={18} />
          Bloquear cofre
        </button>
      </div>
    </div>
  );
}
