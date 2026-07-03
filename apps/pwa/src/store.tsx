import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_GENERATOR_OPTIONS,
  PBKDF2_ITERATIONS,
  credKey,
  decryptWithKey,
  demoVault,
  deriveVaultKey,
  encryptWithKey,
  exportVault,
  generatePassword,
  importVault,
  isWebAuthnAvailable,
  normalizeVault,
  randomSalt,
  registerBiometric,
  tokenKey,
  verifyBiometric,
  type Credential,
  type GeneratorOptions,
  type TotpToken,
  type Vault,
} from '@aegis/core';
import {
  DEFAULT_SETTINGS,
  clearWrappedVaultKey,
  hasWrappedVaultKey,
  loadGoogle,
  loadSettings,
  loadVaultEnvelope,
  saveGoogle,
  saveSettings,
  saveVaultEnvelope,
  storeWrappedVaultKey,
  unwrapVaultKey,
  type RememberedGoogle,
  type Settings,
} from './storage';
import {
  clearToken,
  downloadVault,
  fetchAccount,
  getAccessToken,
  getCachedToken,
  isGoogleConfigured,
} from './google';
import { syncWithDrive } from './sync';

export type Tab = 'vault' | '2fa' | 'gen' | 'settings';
export type Folder = 'Todos' | 'Pessoal' | 'Trabalho' | 'Financeiro';
export type Phase = 'loading' | 'onboarding' | 'locked' | 'unlocked';

const SCAN_MIN_MS = 1_150;
const SYNC_DEBOUNCE_MS = 2_500;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export type GoogleState = {
  configured: boolean;
  account: RememberedGoogle | null;
  status: SyncStatus;
  lastSync: number | null;
  error: string;
};

type AppState = {
  phase: Phase;
  vault: Vault | null;
  settings: Settings;
  google: GoogleState;
  /** Biometria pronta para uso na tela de bloqueio. */
  bioReady: boolean;
  scanning: boolean;
  unlockError: string;
  tab: Tab;
  detailId: string | null;
  /** Item em edição: undefined = fechado, null = novo item. */
  editingId: string | null | undefined;
  addingToken: boolean;
  folder: Folder;
  search: string;
  revealed: boolean;
  genOpts: GeneratorOptions;
  genPass: string;
  toast: string;

  createVault: (name: string, password: string, seedDemo: boolean) => Promise<void>;
  unlockWithPassword: (password: string) => Promise<boolean>;
  unlockWithBiometric: () => void;
  lock: () => void;
  clearUnlockError: () => void;

  setTab: (tab: Tab) => void;
  openDetail: (id: string) => void;
  back: () => void;
  openEdit: (id: string | null) => void;
  closeEdit: () => void;
  openAddToken: () => void;
  closeAddToken: () => void;
  setFolder: (folder: Folder) => void;
  setSearch: (search: string) => void;
  toggleReveal: () => void;

  saveCredential: (cred: Credential) => void;
  deleteCredential: (id: string) => void;
  addToken: (token: Omit<TotpToken, 'id' | 'updatedAt'>) => void;
  deleteToken: (id: string) => void;

  setGenOpts: (patch: Partial<GeneratorOptions>) => void;
  regen: () => void;

  setBio: (on: boolean) => Promise<void>;
  toggleBackup: () => void;
  cycleAutoLock: () => void;
  copy: (label: string, value: string) => void;
  share: (cred: Credential) => void;
  doExport: () => void;
  importBackup: (fileText: string, filePassword: string) => Promise<boolean>;

  connectGoogle: () => Promise<void>;
  disconnectGoogle: () => void;
  syncNow: () => Promise<void>;
  /** Restaura um cofre existente do Drive (onboarding em novo dispositivo). */
  restoreFromGoogle: () => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);

const AUTO_LOCK_OPTIONS = [1, 5, 15];

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [vault, setVault] = useState<Vault | null>(null);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [bioReady, setBioReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [tab, setTabState] = useState<Tab>('vault');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);
  const [addingToken, setAddingToken] = useState(false);
  const [folder, setFolder] = useState<Folder>('Todos');
  const [search, setSearch] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [genOpts, setGenOptsState] = useState<GeneratorOptions>(DEFAULT_GENERATOR_OPTIONS);
  const [genPass, setGenPass] = useState(() => generatePassword(DEFAULT_GENERATOR_OPTIONS));
  const [toast, setToast] = useState('');
  const [google, setGoogle] = useState<GoogleState>({
    configured: isGoogleConfigured(),
    account: null,
    status: 'idle',
    lastSync: null,
    error: '',
  });

  const keyRef = useRef<CryptoKey | null>(null);
  const kdfRef = useRef<{ salt: string; iterations: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const syncTimer = useRef<ReturnType<typeof setTimeout>>();
  const vaultRef = useRef<Vault | null>(null);
  vaultRef.current = vault;

  // Estado inicial: cofre existente → bloqueado; senão → onboarding
  useEffect(() => {
    const envelope = loadVaultEnvelope();
    const stored = loadSettings();
    setSettingsState(stored);
    setBioReady(stored.bio && hasWrappedVaultKey() && isWebAuthnAvailable());
    setGoogle((g) => ({ ...g, account: loadGoogle() }));
    setPhase(envelope ? 'locked' : 'onboarding');
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast('');
    clearTimeout(toastTimer.current);
    // Reinicia a animação do toast mesmo em cópias consecutivas
    requestAnimationFrame(() => {
      setToast(msg);
      toastTimer.current = setTimeout(() => setToast(''), 1400);
    });
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const persist = useCallback(async (nextVault: Vault) => {
    const key = keyRef.current;
    const kdf = kdfRef.current;
    if (!key || !kdf) return;
    const { iv, ct } = await encryptWithKey(key, JSON.stringify(nextVault));
    saveVaultEnvelope({ v: 1, kdf: 'PBKDF2-SHA256', iterations: kdf.iterations, salt: kdf.salt, iv, ct });
  }, []);

  // ---------- Sincronização com o Google Drive ----------

  /**
   * Executa um ciclo pull+merge+push. `silent` (auto-sync) NUNCA abre o
   * diálogo do Google: usa só um token já em cache; sem token, apenas ignora.
   * O login interativo acontece só em ações explícitas (Conectar/Sincronizar).
   */
  const runSync = useCallback(async (silent: boolean): Promise<void> => {
    const key = keyRef.current;
    const kdf = kdfRef.current;
    const current = vaultRef.current;
    if (!key || !kdf || !current || !loadGoogle() || !isGoogleConfigured()) return;

    if (!navigator.onLine) {
      setGoogle((g) => ({ ...g, status: 'offline' }));
      return;
    }

    let token = getCachedToken();
    if (!token) {
      if (silent) return; // auto-sync jamais interrompe com o login do Google
      try {
        token = await getAccessToken(false);
      } catch (err) {
        setGoogle((g) => ({ ...g, status: 'error', error: (err as Error).message }));
        showToast('Falha na sincronização');
        return;
      }
    }

    setGoogle((g) => ({ ...g, status: 'syncing', error: '' }));
    try {
      const { vault: merged, changed } = await syncWithDrive(current, { token, key, kdf });
      if (changed) {
        await persist(merged);
        setVault(merged);
      }
      setGoogle((g) => ({ ...g, status: 'synced', lastSync: Date.now(), error: '' }));
      if (!silent && changed) showToast('Cofre sincronizado');
    } catch (err) {
      setGoogle((g) => ({ ...g, status: 'error', error: (err as Error).message }));
      if (!silent) showToast('Falha na sincronização');
    }
    // showToast e persist são estáveis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist]);

  /** Agenda um push após uma mutação local (debounced). */
  const scheduleSync = useCallback(() => {
    if (!loadGoogle() || !isGoogleConfigured()) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void runSync(true), SYNC_DEBOUNCE_MS);
  }, [runSync]);

  const mutateVault = useCallback(
    (fn: (v: Vault) => Vault) => {
      setVault((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        void persist(next);
        scheduleSync();
        return next;
      });
    },
    [persist, scheduleSync],
  );

  // ---------- Ciclo de vida do cofre ----------

  const createVault = useCallback(
    async (name: string, password: string, seedDemo: boolean) => {
      const profileName = name.trim() || 'Marina Souza';
      const salt = randomSalt();
      const key = await deriveVaultKey(password, salt);
      keyRef.current = key;
      kdfRef.current = { salt, iterations: PBKDF2_ITERATIONS };
      const fresh: Vault = seedDemo
        ? demoVault(profileName)
        : { profile: { name: profileName }, credentials: [], tokens: [], tombstones: {}, updatedAt: Date.now() };
      await persist(fresh);
      setVault(fresh);
      setPhase('unlocked');
    },
    [persist],
  );

  const finishUnlock = useCallback(
    (unlockedVault: Vault) => {
      setVault(normalizeVault(unlockedVault));
      setUnlockError('');
      setPhase('unlocked');
      setTabState('vault');
      setDetailId(null);
      // Puxa do Drive ao desbloquear (se conectado)
      if (loadGoogle() && isGoogleConfigured()) setTimeout(() => void runSync(true), 300);
    },
    [runSync],
  );

  const unlockWithPassword = useCallback(
    async (password: string): Promise<boolean> => {
      const envelope = loadVaultEnvelope();
      if (!envelope) return false;
      try {
        const key = await deriveVaultKey(password, envelope.salt, envelope.iterations);
        const plaintext = await decryptWithKey(key, envelope.iv, envelope.ct);
        keyRef.current = key;
        kdfRef.current = { salt: envelope.salt, iterations: envelope.iterations };
        finishUnlock(normalizeVault(JSON.parse(plaintext) as Vault));
        return true;
      } catch {
        setUnlockError('Senha-mestra incorreta');
        return false;
      }
    },
    [finishUnlock],
  );

  const unlockWithBiometric = useCallback(() => {
    setScanning((current) => {
      if (current) return current;
      const started = Date.now();
      const finish = (fn: () => void) => {
        const wait = Math.max(0, SCAN_MIN_MS - (Date.now() - started));
        setTimeout(() => {
          setScanning(false);
          fn();
        }, wait);
      };
      (async () => {
        const verified = await verifyBiometric('aegis');
        if (!verified) return finish(() => setUnlockError('Verificação biométrica falhou'));
        const key = await unwrapVaultKey();
        const envelope = loadVaultEnvelope();
        if (!key || !envelope) return finish(() => setUnlockError('Use a senha-mestra'));
        try {
          const plaintext = await decryptWithKey(key, envelope.iv, envelope.ct);
          keyRef.current = key;
          kdfRef.current = { salt: envelope.salt, iterations: envelope.iterations };
          finish(() => finishUnlock(normalizeVault(JSON.parse(plaintext) as Vault)));
        } catch {
          finish(() => setUnlockError('Use a senha-mestra'));
        }
      })().catch(() => finish(() => setUnlockError('Verificação biométrica falhou')));
      return true;
    });
  }, [finishUnlock]);

  const lock = useCallback(() => {
    keyRef.current = null;
    setVault(null);
    setScanning(false);
    setPhase('locked');
    setTabState('vault');
    setDetailId(null);
    setEditingId(undefined);
    setAddingToken(false);
    setRevealed(false);
    setBioReady(loadSettings().bio && hasWrappedVaultKey() && isWebAuthnAvailable());
  }, []);

  // Bloqueio automático por inatividade
  useEffect(() => {
    if (phase !== 'unlocked') return;
    const ms = settings.autoLockMin * 60_000;
    let timer = setTimeout(lock, ms);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, ms);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, reset));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [phase, settings.autoLockMin, lock]);

  // ---------- Navegação ----------

  const setTab = useCallback((next: Tab) => {
    setTabState(next);
    setDetailId(null);
  }, []);

  const openDetail = useCallback((id: string) => {
    setDetailId(id);
    setRevealed(false);
  }, []);

  const back = useCallback(() => setDetailId(null), []);
  const openEdit = useCallback((id: string | null) => setEditingId(id), []);
  const closeEdit = useCallback(() => setEditingId(undefined), []);
  const openAddToken = useCallback(() => setAddingToken(true), []);
  const closeAddToken = useCallback(() => setAddingToken(false), []);
  const toggleReveal = useCallback(() => setRevealed((r) => !r), []);

  // ---------- CRUD ----------

  const saveCredential = useCallback(
    (cred: Credential) => {
      const stamped = { ...cred, updatedAt: Date.now() };
      mutateVault((v) => {
        const exists = v.credentials.some((c) => c.id === stamped.id);
        return {
          ...v,
          credentials: exists
            ? v.credentials.map((c) => (c.id === stamped.id ? stamped : c))
            : [...v.credentials, stamped],
          updatedAt: Date.now(),
        };
      });
      showToast('Item salvo');
    },
    [mutateVault, showToast],
  );

  const deleteCredential = useCallback(
    (id: string) => {
      const now = Date.now();
      mutateVault((v) => ({
        ...v,
        credentials: v.credentials.filter((c) => c.id !== id),
        tombstones: { ...v.tombstones, [credKey(id)]: now },
        updatedAt: now,
      }));
      setDetailId(null);
      setEditingId(undefined);
      showToast('Item excluído');
    },
    [mutateVault, showToast],
  );

  const addToken = useCallback(
    (token: Omit<TotpToken, 'id' | 'updatedAt'>) => {
      const now = Date.now();
      mutateVault((v) => ({
        ...v,
        tokens: [...v.tokens, { ...token, id: crypto.randomUUID(), updatedAt: now }],
        updatedAt: now,
      }));
      showToast('Token adicionado');
    },
    [mutateVault, showToast],
  );

  const deleteToken = useCallback(
    (id: string) => {
      const now = Date.now();
      mutateVault((v) => ({
        ...v,
        tokens: v.tokens.filter((t) => t.id !== id),
        tombstones: { ...v.tombstones, [tokenKey(id)]: now },
        updatedAt: now,
      }));
      showToast('Token removido');
    },
    [mutateVault, showToast],
  );

  // ---------- Gerador ----------

  const setGenOpts = useCallback((patch: Partial<GeneratorOptions>) => {
    setGenOptsState((prev) => {
      const next = { ...prev, ...patch };
      setGenPass(generatePassword(next));
      return next;
    });
  }, []);

  const regen = useCallback(() => {
    setGenOptsState((prev) => {
      setGenPass(generatePassword(prev));
      return prev;
    });
  }, []);

  // ---------- Ajustes ----------

  const setBio = useCallback(
    async (on: boolean) => {
      if (!on) {
        clearWrappedVaultKey();
        setSettings({ bio: false });
        return;
      }
      if (!isWebAuthnAvailable() || !keyRef.current || !vault) {
        showToast('Biometria não disponível neste dispositivo');
        return;
      }
      const registered = await registerBiometric(vault.profile.name);
      if (!registered) {
        showToast('Não foi possível registrar a biometria');
        return;
      }
      await storeWrappedVaultKey(keyRef.current);
      setSettings({ bio: true });
      showToast('Desbloqueio biométrico ativado');
    },
    [vault, setSettings, showToast],
  );

  const toggleBackup = useCallback(() => {
    setSettingsState((prev) => {
      const next = { ...prev, backup: !prev.backup };
      saveSettings(next);
      return next;
    });
  }, []);

  const cycleAutoLock = useCallback(() => {
    setSettingsState((prev) => {
      const idx = AUTO_LOCK_OPTIONS.indexOf(prev.autoLockMin);
      const next = { ...prev, autoLockMin: AUTO_LOCK_OPTIONS[(idx + 1) % AUTO_LOCK_OPTIONS.length] };
      saveSettings(next);
      return next;
    });
  }, []);

  const copy = useCallback(
    (label: string, value: string) => {
      navigator.clipboard
        ?.writeText(value)
        .then(() => showToast(`${label} copiado`))
        .catch(() => showToast('Não foi possível copiar'));
    },
    [showToast],
  );

  const share = useCallback(
    (cred: Credential) => {
      const text = `${cred.name} — ${cred.username} (${cred.domain})`;
      if (navigator.share) {
        navigator.share({ title: cred.name, text }).catch(() => {});
      } else {
        copy('Item', text);
      }
    },
    [copy],
  );

  const doExport = useCallback(() => {
    if (!vault) return;
    const password = window.prompt('Senha para cifrar o backup (.aegis):');
    if (!password) return;
    exportVault(vault, password).then((contents) => {
      const blob = new Blob([contents], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cofre-${new Date().toISOString().slice(0, 10)}.aegis`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup exportado');
    });
  }, [vault, showToast]);

  const importBackup = useCallback(
    async (fileText: string, filePassword: string): Promise<boolean> => {
      try {
        const imported = await importVault(fileText, filePassword);
        mutateVault(() => imported);
        showToast('Cofre importado');
        return true;
      } catch {
        showToast('Arquivo ou senha inválidos');
        return false;
      }
    },
    [mutateVault, showToast],
  );

  // ---------- Google Drive ----------

  const connectGoogle = useCallback(async () => {
    if (!isGoogleConfigured()) {
      showToast('Configure o VITE_GOOGLE_CLIENT_ID');
      return;
    }
    setGoogle((g) => ({ ...g, status: 'syncing', error: '' }));
    try {
      const token = await getAccessToken(true);
      const account = await fetchAccount(token);
      const remembered: RememberedGoogle = { email: account.email, name: account.name, picture: account.picture };
      saveGoogle(remembered);
      setGoogle((g) => ({ ...g, account: remembered }));
      await runSync(false);
      showToast(`Conectado como ${account.email}`);
    } catch (err) {
      setGoogle((g) => ({ ...g, status: 'error', error: (err as Error).message }));
      showToast('Não foi possível conectar ao Google');
    }
  }, [runSync, showToast]);

  const disconnectGoogle = useCallback(() => {
    clearToken();
    saveGoogle(null);
    clearTimeout(syncTimer.current);
    setGoogle((g) => ({ ...g, account: null, status: 'idle', lastSync: null, error: '' }));
    showToast('Google desconectado');
  }, [showToast]);

  const syncNow = useCallback(() => runSync(false), [runSync]);

  /**
   * Onboarding em dispositivo novo: entra com Google, baixa o cofre cifrado
   * existente e vai para a tela de bloqueio (a senha-mestra decifra em seguida).
   * Assim não é preciso "criar cofre" toda vez.
   */
  const restoreFromGoogle = useCallback(async () => {
    if (!isGoogleConfigured()) {
      showToast('Configure o VITE_GOOGLE_CLIENT_ID');
      return;
    }
    setGoogle((g) => ({ ...g, status: 'syncing', error: '' }));
    try {
      const token = await getAccessToken(true);
      const account = await fetchAccount(token);
      const envelope = await downloadVault(token);
      if (!envelope) {
        setGoogle((g) => ({ ...g, status: 'idle' }));
        showToast('Nenhum cofre no Drive desta conta — crie um');
        return;
      }
      const remembered: RememberedGoogle = { email: account.email, name: account.name, picture: account.picture };
      saveVaultEnvelope(envelope);
      saveGoogle(remembered);
      setGoogle((g) => ({ ...g, account: remembered, status: 'synced', lastSync: Date.now() }));
      setBioReady(false); // biometria precisa ser reconfigurada neste aparelho
      setPhase('locked');
      showToast('Cofre encontrado — digite a senha-mestra');
    } catch (err) {
      setGoogle((g) => ({ ...g, status: 'error', error: (err as Error).message }));
      showToast('Não foi possível conectar ao Google');
    }
  }, [showToast]);

  const value = useMemo<AppState>(
    () => ({
      phase, vault, settings, google, bioReady, scanning, unlockError,
      tab, detailId, editingId, addingToken, folder, search, revealed,
      genOpts, genPass, toast,
      createVault, unlockWithPassword, unlockWithBiometric, lock,
      clearUnlockError: () => setUnlockError(''),
      setTab, openDetail, back, openEdit, closeEdit, openAddToken, closeAddToken,
      setFolder, setSearch, toggleReveal,
      saveCredential, deleteCredential, addToken, deleteToken,
      setGenOpts, regen,
      setBio, toggleBackup, cycleAutoLock, copy, share, doExport, importBackup,
      connectGoogle, disconnectGoogle, syncNow, restoreFromGoogle,
    }),
    [
      phase, vault, settings, google, bioReady, scanning, unlockError,
      tab, detailId, editingId, addingToken, folder, search, revealed,
      genOpts, genPass, toast,
      createVault, unlockWithPassword, unlockWithBiometric, lock,
      setTab, openDetail, back, openEdit, closeEdit, openAddToken, closeAddToken,
      toggleReveal, saveCredential, deleteCredential, addToken, deleteToken,
      setGenOpts, regen, setBio, toggleBackup, cycleAutoLock, copy, share, doExport, importBackup,
      connectGoogle, disconnectGoogle, syncNow, restoreFromGoogle,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>');
  return ctx;
}
