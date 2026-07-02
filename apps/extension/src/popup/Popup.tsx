import { useEffect, useMemo, useState } from 'react';
import {
  AVATAR_STYLES,
  DEFAULT_GENERATOR_OPTIONS,
  DEMO_CREDENTIALS,
  DEMO_TOKENS,
  formatTotp,
  generatePassword,
  generateTotp,
  TOTP_PERIOD,
  totpCounter,
  totpRemaining,
  type Credential,
} from '@aegis/core';
import {
  AegisLogo,
  Avatar,
  CountdownRing,
  IconArrowRight,
  IconClock,
  IconRefresh,
  IconSearch,
  ringColor,
} from '@aegis/ui';

/** Casa o hostname da aba ativa com os domínios das credenciais do cofre. */
function matchByHost(host: string): Credential[] {
  if (!host) return [];
  const h = host.replace(/^www\./, '').toLowerCase();
  return DEMO_CREDENTIALS.filter((c) => {
    const d = c.domain.toLowerCase();
    return d === h || d.endsWith(`.${h}`) || h.endsWith(d.replace(/^[^.]+\./, '.')) || h === d.replace(/^accounts\./, '');
  });
}

function useActiveTabHost(): string {
  const [host, setHost] = useState('');
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setHost('acmebank.com.br'); // dev fora da extensão (vite dev)
      return;
    }
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

function TokenRow({ id, issuer, secret, now }: { id: string; issuer: string; secret: string; now: number }) {
  const [code, setCode] = useState('');
  const counter = totpCounter(now);
  useEffect(() => {
    generateTotp(secret, now).then((c) => setCode(formatTotp(c)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret, counter]);
  const remaining = totpRemaining(now);
  const avatar = AVATAR_STYLES[id] ?? { color: 'var(--accent-grad)', initial: issuer[0] };
  const periodKey = totpCounter(now);

  return (
    <button
      type="button"
      className="pop-token"
      onClick={() => navigator.clipboard?.writeText(code.replace(' ', ''))}
      title="Copiar código"
    >
      <Avatar color={avatar.color} initial={avatar.initial} size={30} radius={9} fontSize={12} shadow={false} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pop-token-issuer">{issuer}</div>
        <div className="pop-token-code">{code}</div>
      </div>
      <CountdownRing
        size={30}
        frac={remaining / TOTP_PERIOD}
        remaining={remaining}
        color={ringColor(remaining)}
        fontSize={10}
        periodKey={periodKey}
      />
    </button>
  );
}

export function Popup() {
  const host = useActiveTabHost();
  const [search, setSearch] = useState('');
  const [show2fa, setShow2fa] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!show2fa) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [show2fa]);

  const forPage = useMemo(() => matchByHost(host), [host]);
  const q = search.trim().toLowerCase();
  const list = q
    ? DEMO_CREDENTIALS.filter((c) => c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q))
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

  const generate = () => {
    const pw = generatePassword(DEFAULT_GENERATOR_OPTIONS);
    navigator.clipboard?.writeText(pw);
  };

  return (
    <div className="pop">
      <div className="pop-header">
        <AegisLogo size={30} iconSize={17} radius={9} shadow={false} />
        <span className="pop-title">Aegis</span>
        <span className="pop-online" />
      </div>
      <div className="pop-body">
        <div className="pop-search">
          <IconSearch size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" />
        </div>

        <div className="pop-section">{q ? 'RESULTADOS' : 'PARA ESTA PÁGINA'}</div>
        {list.length === 0 && <div className="pop-empty">Nenhuma conta para {host || 'esta página'}</div>}
        {list.map((cred) => {
          const avatar =
            AVATAR_STYLES[cred.id] ?? { color: 'var(--acme-blue-grad)', initial: cred.name[0] };
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
          <button type="button" className="pop-action" onClick={generate} title="Gerar e copiar senha forte">
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
            {DEMO_TOKENS.map((t) => (
              <TokenRow key={t.id} id={t.id} issuer={t.issuer} secret={t.secret} now={now} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
