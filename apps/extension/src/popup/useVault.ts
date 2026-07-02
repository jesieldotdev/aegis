import { useCallback, useEffect, useRef, useState } from 'react';
import {
  decryptWithKey,
  deriveVaultKey,
  downloadVaultEnvelope,
  fetchAccount,
  normalizeVault,
  type EncryptedEnvelope,
  type GoogleAccount,
  type Vault,
} from '@aegis/core';
import { isGoogleConfigured, requestAccessToken } from '../auth';
import {
  allowContentScriptSession,
  clearSession,
  disconnect as clearAll,
  getSessionToken,
  getSessionVault,
  getStoredAccount,
  getStoredEnvelope,
  setSessionToken,
  setSessionVault,
  setStoredAccount,
  setStoredEnvelope,
} from '../vault-store';

export type Phase = 'loading' | 'disconnected' | 'locked' | 'unlocked';

export type VaultController = {
  phase: Phase;
  account: GoogleAccount | null;
  vault: Vault | null;
  configured: boolean;
  busy: boolean;
  error: string;
  connect: () => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  refresh: () => Promise<void>;
  lock: () => void;
  disconnect: () => void;
};

export function useVault(): VaultController {
  const [phase, setPhase] = useState<Phase>('loading');
  const [account, setAccount] = useState<GoogleAccount | null>(null);
  const [vault, setVault] = useState<Vault | null>(null);
  const [envelope, setEnvelope] = useState<EncryptedEnvelope | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Chave derivada mantida só em memória, durante a sessão da popup.
  const keyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    void allowContentScriptSession();
    (async () => {
      const [sessionVault, storedAccount, storedEnv] = await Promise.all([
        getSessionVault(),
        getStoredAccount(),
        getStoredEnvelope(),
      ]);
      setAccount(storedAccount);
      setEnvelope(storedEnv);
      if (sessionVault) {
        setVault(sessionVault);
        setPhase('unlocked');
      } else if (storedEnv) {
        setPhase('locked');
      } else {
        setPhase('disconnected');
      }
    })();
  }, []);

  /** Baixa o envelope cifrado do Drive (não decifra). */
  const pull = useCallback(async (): Promise<EncryptedEnvelope | null> => {
    let token = await getSessionToken();
    if (!token) {
      token = await requestAccessToken(true);
      await setSessionToken(token);
      const acc = await fetchAccount(token);
      await setStoredAccount(acc);
      setAccount(acc);
    }
    const remote = await downloadVaultEnvelope(token);
    if (remote) {
      await setStoredEnvelope(remote);
      setEnvelope(remote);
    }
    return remote;
  }, []);

  const connect = useCallback(async () => {
    if (!isGoogleConfigured()) {
      setError('Configure o VITE_GOOGLE_CLIENT_ID');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const remote = await pull();
      if (!remote) {
        setError('Nenhum cofre encontrado no Drive desta conta');
      } else {
        setPhase('locked');
      }
    } catch (err) {
      setError((err as Error).message || 'Falha ao conectar');
    } finally {
      setBusy(false);
    }
  }, [pull]);

  const unlock = useCallback(
    async (masterPassword: string) => {
      if (!envelope) return;
      setBusy(true);
      setError('');
      try {
        const key = await deriveVaultKey(masterPassword, envelope.salt, envelope.iterations);
        const plaintext = await decryptWithKey(key, envelope.iv, envelope.ct);
        const unlocked = normalizeVault(JSON.parse(plaintext) as Vault);
        keyRef.current = key;
        await setSessionVault(unlocked);
        setVault(unlocked);
        setPhase('unlocked');
      } catch {
        setError('Senha-mestra incorreta');
      } finally {
        setBusy(false);
      }
    },
    [envelope],
  );

  /** Puxa a versão mais recente do Drive e re-decifra com a chave em memória. */
  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const remote = await pull();
      if (!remote) {
        setError('Cofre não encontrado no Drive');
        return;
      }
      if (keyRef.current) {
        try {
          const plaintext = await decryptWithKey(keyRef.current, remote.iv, remote.ct);
          const fresh = normalizeVault(JSON.parse(plaintext) as Vault);
          await setSessionVault(fresh);
          setVault(fresh);
        } catch {
          // Envelope cifrado com outra senha-mestra: exige novo unlock.
          setError('Cofre atualizado — bloqueie e desbloqueie para aplicar');
        }
      } else {
        setError('Cofre atualizado — desbloqueie para aplicar');
      }
    } catch (err) {
      setError((err as Error).message || 'Falha ao atualizar');
    } finally {
      setBusy(false);
    }
  }, [pull]);

  const lock = useCallback(() => {
    keyRef.current = null;
    void clearSession();
    setVault(null);
    setPhase(envelope ? 'locked' : 'disconnected');
  }, [envelope]);

  const disconnect = useCallback(() => {
    keyRef.current = null;
    void clearAll();
    setVault(null);
    setEnvelope(null);
    setAccount(null);
    setPhase('disconnected');
  }, []);

  return {
    phase,
    account,
    vault,
    configured: isGoogleConfigured(),
    busy,
    error,
    connect,
    unlock,
    refresh,
    lock,
    disconnect,
  };
}
