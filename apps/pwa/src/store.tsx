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
  DEMO_USER,
  DEMO_VAULT,
  exportVault,
  generatePassword,
  isPlatformAuthenticatorAvailable,
  verifyBiometric,
  type GeneratorOptions,
  type Vault,
} from '@aegis/core';

export type Tab = 'vault' | '2fa' | 'gen' | 'settings';
export type Folder = 'Todos' | 'Pessoal' | 'Trabalho' | 'Financeiro';

const AUTO_LOCK_MS = 60_000;
const SCAN_MIN_MS = 1_150;

type AppState = {
  vault: Vault;
  user: typeof DEMO_USER;
  locked: boolean;
  scanning: boolean;
  tab: Tab;
  detailId: string | null;
  folder: Folder;
  search: string;
  revealed: boolean;
  genOpts: GeneratorOptions;
  genPass: string;
  bio: boolean;
  backup: boolean;
  toast: string;
  unlock: () => void;
  lock: () => void;
  setTab: (tab: Tab) => void;
  openDetail: (id: string) => void;
  back: () => void;
  setFolder: (folder: Folder) => void;
  setSearch: (search: string) => void;
  toggleReveal: () => void;
  setGenOpts: (patch: Partial<GeneratorOptions>) => void;
  regen: () => void;
  toggleBio: () => void;
  toggleBackup: () => void;
  copy: (label: string, value: string) => void;
  doExport: () => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [vault] = useState<Vault>(DEMO_VAULT);
  const [locked, setLocked] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [tab, setTabState] = useState<Tab>('vault');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>('Todos');
  const [search, setSearch] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [genOpts, setGenOptsState] = useState<GeneratorOptions>(DEFAULT_GENERATOR_OPTIONS);
  const [genPass, setGenPass] = useState(() => generatePassword(DEFAULT_GENERATOR_OPTIONS));
  const [bio, setBio] = useState(true);
  const [backup, setBackup] = useState(true);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string) => {
    setToast('');
    clearTimeout(toastTimer.current);
    // Reinicia a animação do toast mesmo em cópias consecutivas
    requestAnimationFrame(() => {
      setToast(msg);
      toastTimer.current = setTimeout(() => setToast(''), 1400);
    });
  }, []);

  const lock = useCallback(() => {
    setLocked(true);
    setScanning(false);
    setTabState('vault');
    setDetailId(null);
    setRevealed(false);
  }, []);

  const unlock = useCallback(() => {
    setScanning((current) => {
      if (current) return current;
      const started = Date.now();
      const finish = (ok: boolean) => {
        const wait = Math.max(0, SCAN_MIN_MS - (Date.now() - started));
        setTimeout(() => {
          setScanning(false);
          if (ok) setLocked(false);
          else showToast('Verificação não concluída');
        }, wait);
      };
      // WebAuthn real quando há autenticador de plataforma; senão, demo simulada
      isPlatformAuthenticatorAvailable()
        .then((available) => (available ? verifyBiometric(DEMO_USER.email) : true))
        .then(finish)
        .catch(() => finish(false));
      return true;
    });
  }, [showToast]);

  // Bloqueio automático após 1 minuto inativo
  useEffect(() => {
    if (locked) return;
    let timer = setTimeout(lock, AUTO_LOCK_MS);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, AUTO_LOCK_MS);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, reset));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [locked, lock]);

  const setTab = useCallback((next: Tab) => {
    setTabState(next);
    setDetailId(null);
  }, []);

  const openDetail = useCallback((id: string) => {
    setDetailId(id);
    setRevealed(false);
  }, []);

  const back = useCallback(() => setDetailId(null), []);
  const toggleReveal = useCallback(() => setRevealed((r) => !r), []);

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

  const copy = useCallback(
    (label: string, value: string) => {
      navigator.clipboard
        ?.writeText(value)
        .then(() => showToast(`${label} copiado`))
        .catch(() => showToast('Não foi possível copiar'));
    },
    [showToast],
  );

  const doExport = useCallback(() => {
    const password = window.prompt('Senha-mestra para cifrar o backup (.aegis):');
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

  const value = useMemo<AppState>(
    () => ({
      vault,
      user: DEMO_USER,
      locked,
      scanning,
      tab,
      detailId,
      folder,
      search,
      revealed,
      genOpts,
      genPass,
      bio,
      backup,
      toast,
      unlock,
      lock,
      setTab,
      openDetail,
      back,
      setFolder,
      setSearch,
      toggleReveal,
      setGenOpts,
      regen,
      toggleBio: () => setBio((b) => !b),
      toggleBackup: () => setBackup((b) => !b),
      copy,
      doExport,
    }),
    [
      vault, locked, scanning, tab, detailId, folder, search, revealed,
      genOpts, genPass, bio, backup, toast,
      unlock, lock, setTab, openDetail, back, toggleReveal, setGenOpts, regen, copy, doExport,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>');
  return ctx;
}
