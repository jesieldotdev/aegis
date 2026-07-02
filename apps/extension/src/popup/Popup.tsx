import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  DEFAULT_GENERATOR_OPTIONS,
  avatarFor,
  formatTotp,
  generatePassword,
  generateTotp,
  TOTP_PERIOD,
  totpCounter,
  totpRemaining,
  type Credential,
  type TotpToken,
  type Vault,
} from '@aegis/core';
import {
  AegisLogo,
  Avatar,
  CountdownRing,
  IconArrowRight,
  IconClock,
  IconPadlock,
  IconRefresh,
  IconSearch,
  ringColor,
} from '@aegis/ui';
import { useVault } from './useVault';

/** Casa o hostname da aba ativa com os domínios das credenciais do cofre. */
function matchByHost(creds: Credential[], host: string): Credential[] {
  if (!host) return [];
  const h = host.replace(/^www\./, '').toLowerCase();
  return creds.filter((c) => {
    const d = c.domain.toLowerCase();
    const root = d.split('.').slice(-2).join('.');
    return d === h || d.endsWith(`.${h}`) || h.endsWith(`.${d}`) || root === h;
  });
}

function useActiveTabHost(): string {
  const [host, setHost] = useState('');
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        const url = tabs[0]?.url;
        if (url) setHost(new URL(url).hostname);
      })
      .catch(() => {});
  }, []);
  return host;
}

function TokenRow({ token, now }: { token: TotpToken; now: number }) {
  const [code, setCode] = useState('');
  const counter = totpCounter(now);
  useEffect(() => {
    generateTotp(token.secret, now).then((c) => setCode(formatTotp(c))).catch(() => setCode('——— ———'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token.secret, counter]);
  const remaining = totpRemaining(now);
  const avatar = avatarFor(token.id, token.issuer);

  return (
    <button
      type="button"
      className="pop-token"
      onClick={() => navigator.clipboard?.writeText(code.replace(' ', ''))}
      title="Copiar código"
    >
      <Avatar color={avatar.color} initial={avatar.initial} size={30} radius={9} fontSize={12} shadow={false} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pop-token-issuer">{token.issuer}</div>
        <div className="pop-token-code">{code}</div>
      </div>
      <CountdownRing
        size={30}
        frac={remaining / TOTP_PERIOD}
        remaining={remaining}
        color={ringColor(remaining)}
        fontSize={10}
        periodKey={counter}
      />
    </button>
  );
}

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <div className="pop-header">
      <AegisLogo size={30} iconSize={17} radius={9} shadow={false} />
      <span className="pop-title">Aegis</span>
      {children}
    </div>
  );
}

function UnlockedView({ vault, onLock, onRefresh, busy }: {
  vault: Vault;
  onLock: () => void;
  onRefresh: () => void;
  busy: boolean;
}) {
  const host = useActiveTabHost();
  const [search, setSearch] = useState('');
  const [show2fa, setShow2fa] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!show2fa) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [show2fa]);

  const forPage = useMemo(() => matchByHost(vault.credentials, host), [vault.credentials, host]);
  const q = search.trim().toLowerCase();
  const list = q
    ? vault.credentials.filter((c) => c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q))
    : forPage;

  const fill = async (cred: Credential) => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (tabId != null) {
      await chrome.tabs
        .sendMessage(tabId, { type: 'aegis-fill', username: cred.username, password: cred.password })
        .catch(() => {});
      window.close();
    }
  };

  return (
    <div className="pop">
      <Header>
        <button type="button" className={`pop-icon${busy ? ' pop-icon--spin' : ''}`} onClick={onRefresh} title="Sincronizar" aria-label="Sincronizar">
          <IconRefresh size={15} />
        </button>
        <button type="button" className="pop-icon" onClick={onLock} title="Bloquear" aria-label="Bloquear">
          <IconPadlock size={15} />
        </button>
      </Header>
      <div className="pop-body">
        <div className="pop-search">
          <IconSearch size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" />
        </div>

        <div className="pop-section">{q ? 'RESULTADOS' : 'PARA ESTA PÁGINA'}</div>
        {list.length === 0 && <div className="pop-empty">Nenhuma conta para {host || 'esta página'}</div>}
        {list.map((cred) => {
          const avatar = avatarFor(cred.id, cred.name);
          return (
            <div className="pop-cred" key={cred.id} style={{ marginBottom: 6 }}>
              <Avatar color={avatar.color} initial={avatar.initial} size={32} radius={9} fontSize={13} shadow={false} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pop-cred-name">{cred.name}</div>
                <div className="pop-cred-user">{cred.username}</div>
              </div>
              <button type="button" className="pop-fill" onClick={() => fill(cred)} aria-label={`Preencher ${cred.name}`}>
                <IconArrowRight size={15} />
              </button>
            </div>
          );
        })}

        <div className="pop-actions">
          <button
            type="button"
            className="pop-action"
            onClick={() => navigator.clipboard?.writeText(generatePassword(DEFAULT_GENERATOR_OPTIONS))}
            title="Gerar e copiar senha forte"
          >
            <IconRefresh size={14} />
            Gerar
          </button>
          <button
            type="button"
            className={`pop-action${show2fa ? ' pop-action--active' : ''}`}
            onClick={() => setShow2fa((v) => !v)}
          >
            <IconClock size={14} />
            2FA
          </button>
        </div>

        {show2fa && (
          <div className="pop-tokens">
            {vault.tokens.length === 0 && <div className="pop-empty">Nenhum token 2FA no cofre</div>}
            {vault.tokens.map((t) => (
              <TokenRow key={t.id} token={t} now={now} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LockView({ onUnlock, busy, error }: { onUnlock: (pw: string) => void; busy: boolean; error: string }) {
  const [password, setPassword] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password && !busy) onUnlock(password);
  };
  return (
    <div className="pop">
      <Header />
      <form className="pop-gate" onSubmit={submit}>
        <div className="pop-gate-title">Cofre bloqueado</div>
        <div className="pop-gate-sub">Digite a senha-mestra para desbloquear</div>
        <div className="pop-gate-field">
          <IconPadlock size={15} style={{ color: '#7b7b8c', flex: '0 0 auto' }} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha-mestra"
            autoFocus
          />
          <button type="submit" className="pop-gate-go" disabled={busy || !password} aria-label="Desbloquear">
            <IconArrowRight size={15} />
          </button>
        </div>
        {busy && <div className="pop-gate-hint">Derivando chave…</div>}
        {error && <div className="pop-gate-error">{error}</div>}
      </form>
    </div>
  );
}

function ConnectView({ onConnect, busy, error, configured }: {
  onConnect: () => void;
  busy: boolean;
  error: string;
  configured: boolean;
}) {
  return (
    <div className="pop">
      <Header />
      <div className="pop-gate">
        <div className="pop-gate-title">Conectar ao seu cofre</div>
        <div className="pop-gate-sub">
          Entre com o Google para baixar o cofre cifrado do seu Drive. A senha-mestra é pedida em seguida.
        </div>
        <button type="button" className="pop-connect" onClick={onConnect} disabled={busy || !configured}>
          {busy ? 'Conectando…' : 'Conectar com Google'}
        </button>
        {!configured && <div className="pop-gate-hint">Requer VITE_GOOGLE_CLIENT_ID no build</div>}
        {error && <div className="pop-gate-error">{error}</div>}
      </div>
    </div>
  );
}

export function Popup() {
  const ctrl = useVault();

  if (ctrl.phase === 'loading') {
    return (
      <div className="pop">
        <Header />
        <div className="pop-gate">
          <div className="pop-gate-sub">Carregando…</div>
        </div>
      </div>
    );
  }
  if (ctrl.phase === 'unlocked' && ctrl.vault) {
    return <UnlockedView vault={ctrl.vault} onLock={ctrl.lock} onRefresh={() => void ctrl.refresh()} busy={ctrl.busy} />;
  }
  if (ctrl.phase === 'locked') {
    return <LockView onUnlock={(pw) => void ctrl.unlock(pw)} busy={ctrl.busy} error={ctrl.error} />;
  }
  return (
    <ConnectView
      onConnect={() => void ctrl.connect()}
      busy={ctrl.busy}
      error={ctrl.error}
      configured={ctrl.configured}
    />
  );
}
