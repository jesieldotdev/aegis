import type { CSSProperties } from 'react';
import {
  Avatar,
  IconChevronRight,
  IconClock,
  IconKey,
  IconQrPlus,
  IconSearch,
} from '@aegis/ui';
import { avatarFor, estimateStrength, strengthMeta } from '@aegis/core';
import { useApp, type Folder } from '../store';

const FOLDERS: { id: Folder; dot: string }[] = [
  { id: 'Todos', dot: '#a78bfa' },
  { id: 'Pessoal', dot: '#4285F4' },
  { id: 'Trabalho', dot: '#f24e1e' },
  { id: 'Financeiro', dot: '#34d399' },
];

export function Vault() {
  const { vault, folder, setFolder, search, setSearch, openDetail, openEdit } = useApp();
  if (!vault) return null;
  const { credentials, profile } = vault;

  const firstName = profile.name.split(/\s+/)[0] || 'Você';
  const initial = (profile.name[0] || 'A').toUpperCase();
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
            {greeting}, {firstName}
          </div>
          <div className="screen-title">Cofre</div>
        </div>
        <div className="vault-header-actions">
          <button type="button" className="icon-btn" aria-label="Adicionar item" onClick={() => openEdit(null)}>
            <IconQrPlus size={19} />
          </button>
          <div className="vault-avatar">{initial}</div>
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
        {filtered.map((c, i) => {
          const meta = strengthMeta(estimateStrength(c.password));
          const avatar = avatarFor(c.id, c.name);
          return (
            <button
              type="button"
              key={c.id}
              className="vault-item"
              style={{ '--i': i } as CSSProperties}
              onClick={() => openDetail(c.id)}
            >
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
                {c.totpSecret && <IconClock size={16} style={{ color: 'var(--info-2fa)' }} />}
                <span className="strength-dot" style={{ background: meta.color }} title={meta.label} />
                <IconChevronRight size={17} />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="vault-empty">
            {credentials.length === 0 ? 'Cofre vazio — toque em + para adicionar' : 'Nenhum item encontrado'}
          </div>
        )}
      </div>
    </div>
  );
}
