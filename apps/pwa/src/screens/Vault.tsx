import {
  Avatar,
  IconChevronRight,
  IconClock,
  IconFilter,
  IconKey,
  IconSearch,
} from '@aegis/ui';
import { AVATAR_STYLES, strengthMeta } from '@aegis/core';
import { useApp, type Folder } from '../store';

const FOLDERS: { id: Folder; dot: string }[] = [
  { id: 'Todos', dot: '#a78bfa' },
  { id: 'Pessoal', dot: '#4285F4' },
  { id: 'Trabalho', dot: '#f24e1e' },
  { id: 'Financeiro', dot: '#34d399' },
];

export function Vault() {
  const { vault, user, folder, setFolder, search, setSearch, openDetail } = useApp();
  const { credentials } = vault;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const q = search.trim().toLowerCase();
  const filtered = credentials.filter(
    (c) =>
      (folder === 'Todos' || c.category === folder) &&
      (!q ||
        c.name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q)),
  );

  return (
    <div className="screen">
      <div className="vault-header">
        <div>
          <div className="vault-greeting">
            {greeting}, {user.firstName}
          </div>
          <div className="screen-title">Cofre</div>
        </div>
        <div className="vault-header-actions">
          <button type="button" className="icon-btn" aria-label="Filtrar">
            <IconFilter size={19} />
          </button>
          <div className="vault-avatar">{user.initial}</div>
        </div>
      </div>

      <div className="vault-search-wrap">
        <div className="vault-search">
          <IconSearch size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no cofre"
            aria-label="Buscar no cofre"
          />
        </div>
      </div>

      <div className="vault-folders">
        {FOLDERS.map((f) => {
          const count =
            f.id === 'Todos' ? credentials.length : credentials.filter((c) => c.category === f.id).length;
          return (
            <button
              type="button"
              key={f.id}
              className={`folder-chip${folder === f.id ? ' folder-chip--active' : ''}`}
              onClick={() => setFolder(f.id)}
            >
              <span className="folder-chip-dot" style={{ background: f.dot }} />
              {f.id}
              <span className="folder-chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="vault-list">
        {filtered.map((c) => {
          const meta = strengthMeta(c.strength);
          const avatar = AVATAR_STYLES[c.id] ?? { color: 'var(--accent-grad)', initial: c.name[0] };
          return (
            <button type="button" key={c.id} className="vault-item" onClick={() => openDetail(c.id)}>
              <Avatar color={avatar.color} initial={avatar.initial} />
              <div className="vault-item-body">
                <div className="vault-item-title">
                  <span className="vault-item-name">{c.name}</span>
                  {c.passkey && (
                    <span className="passkey-badge">
                      <IconKey size={10} />
                      PASSKEY
                    </span>
                  )}
                </div>
                <div className="vault-item-user">{c.username}</div>
              </div>
              <div className="vault-item-meta">
                {c.has2fa && <IconClock size={16} style={{ color: 'var(--info-2fa)' }} />}
                <span className="strength-dot" style={{ background: meta.color }} title={meta.label} />
                <IconChevronRight size={17} />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <div className="vault-empty">Nenhum item encontrado</div>}
      </div>
    </div>
  );
}
