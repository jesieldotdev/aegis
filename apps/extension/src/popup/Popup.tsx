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
  type Category,
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
  IconCopy,
  IconEye,
  IconEyeOff,
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

/** Código 2FA ao vivo de uma credencial, clicável para copiar. */
function InlineTotp({ secret, now, onCopy }: { secret: string; now: number; onCopy: (code: string) => void }) {
  const [code, setCode] = useState('');
  const counter = totpCounter(now);
  useEffect(() => {
    generateTotp(secret, now).then((c) => setCode(formatTotp(c))).catch(() => setCode('——— ———'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret, counter]);
  const remaining = totpRemaining(now);
  return (
    <button type="button" className="pop-detail-2fa" onClick={() => onCopy(code.replace(' ', ''))}>
      <div>
        <div className="pop-detail-label">Código 2FA</div>
        <div className="pop-detail-2fa-code">{code}</div>
      </div>
      <CountdownRing
        size={28}
        frac={remaining / TOTP_PERIOD}
        remaining={remaining}
        color={ringColor(remaining)}
        fontSize={10}
        periodKey={counter}
      />
    </button>
  );
}

const CATEGORIES: Category[] = ['Pessoal', 'Trabalho', 'Financeiro'];

/** Nome sugerido a partir do host: "portainer.io" -> "Portainer". */
function suggestedName(host: string): string {
  const labels = host.replace(/^www\./, '').split('.');
  const base = labels.length >= 2 ? labels[labels.length - 2] : labels[0] || '';
  return base ? base[0].toUpperCase() + base.slice(1) : '';
}

async function readPageUsername(): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.tabs) return '';
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (tabId == null) return '';
    const resp = (await chrome.tabs.sendMessage(tabId, { type: 'aegis-read-fields' })) as { username?: string };
    return resp?.username ?? '';
  } catch {
    return '';
  }
}

async function fillPage(username: string, password: string): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (tabId != null) {
    await chrome.tabs.sendMessage(tabId, { type: 'aegis-fill', username, password }).catch(() => {});
  }
}

/** Painel "Nova conta": gera senha, preenche a página e salva no cofre. */
function NewAccountPanel({
  host,
  onClose,
  onSaved,
  addCredential,
  copy,
}: {
  host: string;
  onClose: () => void;
  onSaved: () => void;
  addCredential: (draft: Omit<Credential, 'id' | 'updatedAt'>) => Promise<boolean>;
  copy: (label: string, value: string) => void;
}) {
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_GENERATOR_OPTIONS));
  const [name, setName] = useState(() => suggestedName(host));
  const [username, setUsername] = useState('');
  const [domain, setDomain] = useState(host);
  const [category, setCategory] = useState<Category>('Pessoal');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    readPageUsername().then((u) => u && setUsername(u));
  }, []);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const ok = await addCredential({
      name: name.trim(),
      domain: domain.trim(),
      username: username.trim(),
      password,
      category,
      passkey: false,
    });
    setBusy(false);
    if (ok) onSaved();
  };

  return (
    <div className="pop-new">
      <div className="pop-new-pass">
        <div className="pop-new-pass-value">
          {password.split('').map((ch, i) => {
            const cls = /[0-9]/.test(ch) ? 'g-num' : /[^a-zA-Z0-9]/.test(ch) ? 'g-sym' : undefined;
            return (
              <span key={i} className={cls}>
                {ch}
              </span>
            );
          })}
        </div>
        <div className="pop-new-pass-actions">
          <button type="button" className="pop-mini" onClick={() => setPassword(generatePassword(DEFAULT_GENERATOR_OPTIONS))} title="Gerar outra">
            <IconRefresh size={15} />
          </button>
          <button type="button" className="pop-mini pop-mini--accent" onClick={() => copy('Senha', password)} title="Copiar">
            <IconCopy size={15} />
          </button>
        </div>
      </div>

      <label className="pop-field">
        <span className="pop-field-label">Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Portainer" />
      </label>
      <label className="pop-field">
        <span className="pop-field-label">Usuário</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuário ou e-mail" autoCapitalize="none" />
      </label>
      <label className="pop-field">
        <span className="pop-field-label">Domínio</span>
        <input value={domain} onChange={(e) => setDomain(e.target.value)} autoCapitalize="none" />
      </label>

      <div className="pop-cats">
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c}
            className={`pop-cat${category === c ? ' pop-cat--active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="pop-actions">
        <button type="button" className="pop-action" onClick={() => void fillPage(username, password)}>
          <IconArrowRight size={14} />
          Preencher
        </button>
        <button type="button" className="pop-action pop-action--primary" onClick={() => void save()} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar no cofre'}
        </button>
      </div>
      <button type="button" className="pop-new-cancel" onClick={onClose}>
        Cancelar
      </button>
    </div>
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

function UnlockedView({ vault, onLock, onRefresh, busy, canWrite, addCredential }: {
  vault: Vault;
  onLock: () => void;
  onRefresh: () => void;
  busy: boolean;
  canWrite: boolean;
  addCredential: (draft: Omit<Credential, 'id' | 'updatedAt'>) => Promise<boolean>;
}) {
  const host = useActiveTabHost();
  const [search, setSearch] = useState('');
  const [show2fa, setShow2fa] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const toast = (msg: string) => {
    setCopied(msg);
    setTimeout(() => setCopied(''), 1400);
  };

  const forPage = useMemo(() => matchByHost(vault.credentials, host), [vault.credentials, host]);
  const allSorted = useMemo(
    () => [...vault.credentials].sort((a, b) => a.name.localeCompare(b.name)),
    [vault.credentials],
  );
  const q = search.trim().toLowerCase();
  const searching = q.length > 0;
  const list = searching
    ? allSorted.filter(
        (c) => c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q) || c.username.toLowerCase().includes(q),
      )
    : showAll
      ? allSorted
      : forPage;

  const openCred = openId ? vault.credentials.find((c) => c.id === openId) : undefined;
  // Faz o relógio andar enquanto houver algum 2FA visível
  const needTick = show2fa || !!openCred?.totpSecret;
  useEffect(() => {
    if (!needTick) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [needTick]);

  const copy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(`${label} copiado`);
        setTimeout(() => setCopied(''), 1400);
      },
      () => {},
    );
  };

  const toggleOpen = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
    setRevealed(false);
  };

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

  if (creating) {
    return (
      <div className="pop">
        <Header>
          <button type="button" className="pop-icon" onClick={onLock} title="Bloquear" aria-label="Bloquear">
            <IconPadlock size={15} />
          </button>
        </Header>
        <div className="pop-body">
          <div className="pop-section" style={{ paddingTop: 0 }}>NOVA CONTA · {host || 'esta página'}</div>
          <NewAccountPanel
            host={host}
            addCredential={addCredential}
            copy={copy}
            onClose={() => setCreating(false)}
            onSaved={() => {
              setCreating(false);
              toast('Conta salva no cofre');
            }}
          />
        </div>
        {copied && <div className="pop-copied">{copied}</div>}
      </div>
    );
  }

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

        <div className="pop-section pop-section--row">
          <span>{searching ? 'RESULTADOS' : showAll ? `TODAS AS CONTAS · ${allSorted.length}` : 'PARA ESTA PÁGINA'}</span>
          {!searching && (
            <button type="button" className="pop-see-all" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Só desta página' : `Ver todas (${allSorted.length})`}
            </button>
          )}
        </div>
        {list.length === 0 && (
          <div className="pop-empty">
            {searching
              ? 'Nenhuma conta encontrada'
              : `Nenhuma conta para ${host || 'esta página'} — toque em "Ver todas"`}
          </div>
        )}
        <div className="pop-list">
        {list.map((cred) => {
          const avatar = avatarFor(cred.id, cred.name);
          const open = openId === cred.id;
          return (
            <div className={`pop-cred-wrap${open ? ' pop-cred-wrap--open' : ''}`} key={cred.id}>
              <div className="pop-cred">
                <button type="button" className="pop-cred-main" onClick={() => toggleOpen(cred.id)}>
                  <Avatar color={avatar.color} initial={avatar.initial} size={32} radius={9} fontSize={13} shadow={false} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pop-cred-name">{cred.name}</div>
                    <div className="pop-cred-user">{cred.username}</div>
                  </div>
                </button>
                <button type="button" className="pop-fill" onClick={() => fill(cred)} aria-label={`Preencher ${cred.name}`}>
                  <IconArrowRight size={15} />
                </button>
              </div>

              {open && (
                <div className="pop-detail">
                  <button type="button" className="pop-detail-row" onClick={() => copy('Usuário', cred.username)}>
                    <div style={{ minWidth: 0 }}>
                      <div className="pop-detail-label">Usuário</div>
                      <div className="pop-detail-value">{cred.username}</div>
                    </div>
                    <IconCopy size={16} style={{ color: '#9a9aad', flex: '0 0 auto' }} />
                  </button>

                  <div className="pop-detail-row pop-detail-row--pw">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="pop-detail-label">Senha</div>
                      <div className="pop-detail-value pop-detail-value--mono">
                        {revealed ? cred.password : '•'.repeat(Math.min(cred.password.length, 16))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pop-mini"
                      onClick={() => setRevealed((r) => !r)}
                      aria-label={revealed ? 'Ocultar senha' : 'Revelar senha'}
                    >
                      {revealed ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                    <button
                      type="button"
                      className="pop-mini pop-mini--accent"
                      onClick={() => copy('Senha', cred.password)}
                      aria-label="Copiar senha"
                    >
                      <IconCopy size={16} />
                    </button>
                  </div>

                  {cred.totpSecret && <InlineTotp secret={cred.totpSecret} now={now} onCopy={(c) => copy('Código 2FA', c)} />}
                </div>
              )}
            </div>
          );
        })}
        </div>

        <div className="pop-actions">
          <button
            type="button"
            className="pop-action"
            onClick={() => (canWrite ? setCreating(true) : copy('Senha gerada', generatePassword(DEFAULT_GENERATOR_OPTIONS)))}
            title={canWrite ? 'Gerar senha e criar conta' : 'Gerar e copiar senha forte'}
          >
            <IconRefresh size={14} />
            {canWrite ? 'Nova conta' : 'Gerar'}
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

      {copied && <div className="pop-copied">{copied}</div>}
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
    return (
      <UnlockedView
        vault={ctrl.vault}
        onLock={ctrl.lock}
        onRefresh={() => void ctrl.refresh()}
        busy={ctrl.busy}
        canWrite={ctrl.canWrite}
        addCredential={ctrl.addCredential}
      />
    );
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
