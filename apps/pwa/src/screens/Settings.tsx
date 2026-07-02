import { useRef } from 'react';
import {
  IconChevronRight,
  IconClock,
  IconCloudUpload,
  IconDownload,
  IconFingerprint,
  IconGoogle,
  IconPadlock,
  IconRefresh,
  Toggle,
} from '@aegis/ui';
import { useApp, type SyncStatus } from '../store';

const SYNC_LABEL: Record<SyncStatus, string> = {
  idle: 'Pronto para sincronizar',
  syncing: 'Sincronizando…',
  synced: 'Tudo sincronizado',
  error: 'Falha na sincronização',
  offline: 'Sem conexão',
};

function relativeTime(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  return `há ${Math.floor(s / 3600)} h`;
}

export function Settings() {
  const {
    vault, settings, google,
    setBio, toggleBackup, cycleAutoLock, doExport, importBackup, lock,
    connectGoogle, disconnectGoogle, syncNow,
  } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!vault) return null;

  const initial = (vault.profile.name[0] || 'A').toUpperCase();
  const syncSub = google.status === 'synced' && google.lastSync
    ? `Sincronizado ${relativeTime(google.lastSync)}`
    : google.status === 'error' && google.error
      ? google.error
      : SYNC_LABEL[google.status];

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const password = window.prompt('Senha do arquivo .aegis:');
    if (password) await importBackup(text, password);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="screen screen--scroll">
      <div className="screen-header">
        <div className="screen-title">Ajustes</div>
      </div>

      <div className="set-body">
        <div className="set-account">
          <div className="set-account-avatar">{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="set-account-name">{vault.profile.name}</div>
            <div className="set-account-google">
              {google.account ? (
                <>
                  <IconGoogle size={14} />
                  <span className="set-account-email">{google.account.email}</span>
                </>
              ) : (
                <>
                  <IconPadlock size={13} style={{ color: 'var(--success)' }} />
                  Cofre local criptografado
                </>
              )}
            </div>
          </div>
          <span className="online-dot" />
        </div>

        <div>
          <div className="set-section-title">Sincronização na nuvem</div>
          <div className="set-group">
            {google.account ? (
              <>
                <div className={`set-row set-row--click${google.status === 'syncing' ? ' set-row--busy' : ''}`} onClick={() => void syncNow()}>
                  <div className="set-row-icon" style={{ background: 'rgba(139,92,246,.16)', color: 'var(--accent)' }}>
                    <IconRefresh size={18} />
                  </div>
                  <div className="set-row-body">
                    <div className="set-row-title">Sincronizar agora</div>
                    <div className={`set-row-sub${google.status === 'synced' ? ' set-row-sub--success' : ''}${google.status === 'error' ? ' set-row-sub--danger' : ''}`}>
                      {syncSub}
                    </div>
                  </div>
                  <IconChevronRight size={17} style={{ color: '#54546a' }} />
                </div>
                <div className="set-row set-row--click" onClick={disconnectGoogle}>
                  <div className="set-row-icon" style={{ background: 'rgba(251,113,133,.14)', color: 'var(--danger)' }}>
                    <IconGoogle size={18} />
                  </div>
                  <div className="set-row-body">
                    <div className="set-row-title">Desconectar Google</div>
                    <div className="set-row-sub">Para de sincronizar com o Drive</div>
                  </div>
                  <IconChevronRight size={17} style={{ color: '#54546a' }} />
                </div>
              </>
            ) : (
              <div className="set-row set-row--click" onClick={() => void connectGoogle()}>
                <div className="set-row-icon" style={{ background: 'rgba(66,133,244,.16)' }}>
                  <IconGoogle size={18} />
                </div>
                <div className="set-row-body">
                  <div className="set-row-title">Conectar com Google</div>
                  <div className="set-row-sub">
                    {google.configured ? 'Cofre cifrado no seu Google Drive' : 'Requer VITE_GOOGLE_CLIENT_ID'}
                  </div>
                </div>
                <IconChevronRight size={17} style={{ color: '#54546a' }} />
              </div>
            )}
          </div>
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
              <Toggle on={settings.bio} onToggle={() => void setBio(!settings.bio)} variant="success" />
            </div>
            <div className="set-row set-row--click" onClick={cycleAutoLock}>
              <div className="set-row-icon" style={{ background: 'rgba(139,92,246,.16)', color: 'var(--accent)' }}>
                <IconClock size={18} />
              </div>
              <div className="set-row-body">
                <div className="set-row-title">Bloqueio automático</div>
                <div className="set-row-sub">
                  Após {settings.autoLockMin} minuto{settings.autoLockMin > 1 ? 's' : ''} inativo
                </div>
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
                <div className={`set-row-sub${settings.backup ? ' set-row-sub--success' : ''}`}>
                  {settings.backup ? 'Lembretes de backup ativos' : 'Lembretes desativados'}
                </div>
              </div>
              <Toggle on={settings.backup} onToggle={toggleBackup} />
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
            <div className="set-row set-row--click" onClick={() => fileRef.current?.click()}>
              <div className="set-row-icon" style={{ background: 'rgba(255,255,255,.06)', color: '#c1c1cf' }}>
                <IconDownload size={18} style={{ transform: 'rotate(180deg)' }} />
              </div>
              <div className="set-row-body">
                <div className="set-row-title">Importar cofre</div>
                <div className="set-row-sub">Restaurar de um arquivo .aegis</div>
              </div>
              <IconChevronRight size={17} style={{ color: '#54546a' }} />
              <input
                ref={fileRef}
                type="file"
                accept=".aegis,application/json"
                style={{ display: 'none' }}
                onChange={(e) => void onImportFile(e.target.files?.[0])}
              />
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
