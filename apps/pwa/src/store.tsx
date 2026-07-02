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
  decryptWithKey,
  demoVault,
  deriveVaultKey,
  encryptWithKey,
  exportVault,
  generatePassword,
  importVault,
  isWebAuthnAvailable,
  randomSalt,
  registerBiometric,
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
  loadSettings,
  loadVaultEnvelope,
  saveSettings,
  saveVaultEnvelope,
  storeWrappedVaultKey,
  unwrapVaultKey,
  type Settings,
} from './storage';

export type Tab = 'vault' | '2fa' | 'gen' | 'settings';
export type Folder = 'Todos' | 'Pessoal' | 'Trabalho' | 'Financeiro';
export type Phase = 'loading' | 'onboarding' | 'locked' | 'unlocked';

const SCAN_MIN_MS = 1_150;

type AppState = {
  phase: Phase;
  vault: Vault | null;
  settings: Settings;
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
  addToken: (token: Omit<TotpToken, 'id'>) => void;
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

  const keyRef = useRef<CryptoKey | null>(null);
  const kdfRef = useRef<{ salt: string; iterations: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // Estado inicial: cofre existente → bloqueado; senão → onboarding
  useEffect(() => {
    const envelope = loadVaultEnvelope();
    const stored = loadSettings();
    setSettingsState(stored);
    setBioReady(stored.bio && hasWrappedVaultKey() && isWebAuthnAvailable());
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

  const mutateVault = useCallback(
    (fn: (v: Vault) => Vault) => {
      setVault((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        void persist(next);
        return next;
      });
    },
    [persist],
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
        : { profile: { name: profileName }, credentials: [], tokens: [] };
      await persist(fresh);
      setVault(fresh);
      setPhase('unlocked');
    },
    [persist],
  );

  const finishUnlock = useCallback((unlockedVault: Vault) => {
    setVault(unlockedVault);
    setUnlockError('');
    setPhase('unlocked');
    setTabState('vault');
    setDetailId(null);
  }, []);

  const unlockWithPassword = useCallback(
    async (password: string): Promise<boolean> => {
      const envelope = loadVaultEnvelope();
      if (!envelope) return false;
      try {
        const key = await deriveVaultKey(password, envelope.salt, envelope.iterations);
        const plaintext = await decryptWithKey(key, envelope.iv, envelope.ct);
        keyRef.current = key;
        kdfRef.current = { salt: envelope.salt, iterations: envelope.iterations };
        finishUnlock(JSON.parse(plaintext) as Vault);
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
          finish(() => finishUnlock(JSON.parse(plaintext) as Vault));
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
      mutateVault((v) => {
        const exists = v.credentials.some((c) => c.id === cred.id);
        return {
          ...v,
          credentials: exists
            ? v.credentials.map((c) => (c.id === cred.id ? cred : c))
            : [...v.credentials, cred],
        };
      });
      showToast('Item salvo');
    },
    [mutateVault, showToast],
  );

  const deleteCredential = useCallback(
    (id: string) => {
      mutateVault((v) => ({ ...v, credentials: v.credentials.filter((c) => c.id !== id) }));
      setDetailId(null);
      setEditingId(undefined);
      showToast('Item excluído');
    },
    [mutateVault, showToast],
  );

  const addToken = useCallback(
    (token: Omit<TotpToken, 'id'>) => {
      mutateVault((v) => ({ ...v, tokens: [...v.tokens, { ...token, id: crypto.randomUUID() }] }));
      showToast('Token adicionado');
    },
    [mutateVault, showToast],
  );

  const deleteToken = useCallback(
    (id: string) => {
      mutateVault((v) => ({ ...v, tokens: v.tokens.filter((t) => t.id !== id) }));
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

  const value = useMemo<AppState>(
    () => ({
      phase, vault, settings, bioReady, scanning, unlockError,
      tab, detailId, editingId, addingToken, folder, search, revealed,
      genOpts, genPass, toast,
      createVault, unlockWithPassword, unlockWithBiometric, lock,
      clearUnlockError: () => setUnlockError(''),
      setTab, openDetail, back, openEdit, closeEdit, openAddToken, closeAddToken,
      setFolder, setSearch, toggleReveal,
      saveCredential, deleteCredential, addToken, deleteToken,
      setGenOpts, regen,
      setBio, toggleBackup, cycleAutoLock, copy, share, doExport, importBackup,
    }),
    [
      phase, vault, settings, bioReady, scanning, unlockError,
      tab, detailId, editingId, addingToken, folder, search, revealed,
      genOpts, genPass, toast,
      createVault, unlockWithPassword, unlockWithBiometric, lock,
      setTab, openDetail, back, openEdit, closeEdit, openAddToken, closeAddToken,
      toggleReveal, saveCredential, deleteCredential, addToken, deleteToken,
      setGenOpts, regen, setBio, toggleBackup, cycleAutoLock, copy, share, doExport, importBackup,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>');
  return ctx;
}
