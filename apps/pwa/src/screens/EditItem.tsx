import { useState, type FormEvent } from 'react';
import { IconChevronLeft, IconEye, IconEyeOff, IconRefresh } from '@aegis/ui';
import {
  DEFAULT_GENERATOR_OPTIONS,
  generatePassword,
  isValidSecret,
  parseOtpAuth,
  type Category,
  type Credential,
} from '@aegis/core';
import { useApp } from '../store';

const CATEGORIES: Category[] = ['Pessoal', 'Trabalho', 'Financeiro'];

/** Criação/edição de credencial (editingId === null cria um novo item). */
export function EditItem() {
  const { vault, editingId, closeEdit, saveCredential, deleteCredential } = useApp();
  const existing = editingId ? vault?.credentials.find((c) => c.id === editingId) : undefined;
  const tokens = vault?.tokens ?? [];

  const [name, setName] = useState(existing?.name ?? '');
  const [domain, setDomain] = useState(existing?.domain ?? '');
  const [username, setUsername] = useState(existing?.username ?? '');
  const [password, setPassword] = useState(existing?.password ?? '');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'Pessoal');
  const [totpInput, setTotpInput] = useState(existing?.totpSecret ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [show, setShow] = useState(!existing);
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Dê um nome ao item');
    if (!password) return setError('Informe uma senha');

    let totpSecret: string | undefined;
    if (totpInput.trim()) {
      const parsed = parseOtpAuth(totpInput);
      if (!parsed) return setError('Segredo 2FA inválido (base32 ou URI otpauth://)');
      totpSecret = parsed.secret;
    }

    // updatedAt é carimbado por saveCredential no momento de gravar.
    const cred: Credential = {
      id: existing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      domain: domain.trim(),
      username: username.trim(),
      password,
      category,
      passkey: existing?.passkey ?? false,
      totpSecret,
      notes: notes.trim() || undefined,
      updatedAt: existing?.updatedAt ?? 0,
    };
    saveCredential(cred);
    closeEdit();
  };

  const remove = () => {
    if (existing && window.confirm(`Excluir "${existing.name}" do cofre?`)) {
      deleteCredential(existing.id);
    }
  };

  return (
    <div className="screen screen--scroll screen--slide">
      <div className="detail-nav">
        <button type="button" className="icon-btn" onClick={closeEdit} aria-label="Cancelar">
          <IconChevronLeft size={19} />
        </button>
        <div className="screen-title" style={{ fontSize: 19 }}>
          {existing ? 'Editar item' : 'Novo item'}
        </div>
        <div style={{ width: 40 }} />
      </div>

      <form className="detail-fields" style={{ paddingTop: 18 }} onSubmit={submit}>
        <div className="field-card">
          <label className="field-label" htmlFor="ed-name">Nome</label>
          <input id="ed-name" className="ed-input" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="Ex.: Google" />
        </div>

        <div className="field-card">
          <label className="field-label" htmlFor="ed-domain">Domínio</label>
          <input id="ed-domain" className="ed-input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Ex.: accounts.google.com" autoCapitalize="none" />
        </div>

        <div className="field-card">
          <label className="field-label" htmlFor="ed-user">Usuário</label>
          <input id="ed-user" className="ed-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="E-mail ou usuário" autoCapitalize="none" />
        </div>

        <div className="field-card">
          <label className="field-label" htmlFor="ed-pass">Senha</label>
          <div className="ed-pass-row">
            <input
              id="ed-pass"
              className="ed-input ed-input--mono"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Senha"
            />
            <button type="button" className="mini-btn" onClick={() => setShow((s) => !s)} aria-label="Mostrar senha">
              {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
            <button
              type="button"
              className="mini-btn mini-btn--accent"
              onClick={() => { setPassword(generatePassword(DEFAULT_GENERATOR_OPTIONS)); setShow(true); }}
              aria-label="Gerar senha forte"
              title="Gerar senha forte"
            >
              <IconRefresh size={17} />
            </button>
          </div>
        </div>

        <div className="field-card">
          <div className="field-label">Pasta</div>
          <div className="ed-cats">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                className={`folder-chip${category === c ? ' folder-chip--active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="field-card">
          <label className="field-label" htmlFor="ed-totp">Segredo 2FA (opcional)</label>
          {tokens.length > 0 && (
            <div className="ed-2fa-links">
              {tokens.map((t) => {
                const active = totpInput.trim().toUpperCase() === t.secret.toUpperCase();
                return (
                  <button
                    type="button"
                    key={t.id}
                    className={`ed-2fa-chip${active ? ' ed-2fa-chip--active' : ''}`}
                    onClick={() => { setTotpInput(active ? '' : t.secret); setError(''); }}
                    title={t.account ? `${t.issuer} — ${t.account}` : t.issuer}
                  >
                    {t.issuer || t.account || '2FA'}
                  </button>
                );
              })}
            </div>
          )}
          <input
            id="ed-totp"
            className="ed-input ed-input--mono"
            value={totpInput}
            onChange={(e) => { setTotpInput(e.target.value); setError(''); }}
            placeholder="Vincule acima ou cole Base32 / otpauth://totp/…"
            autoCapitalize="none"
            style={totpInput && !parseOtpAuth(totpInput) && !isValidSecret(totpInput) ? { color: 'var(--danger)' } : undefined}
          />
        </div>

        <div className="field-card">
          <label className="field-label" htmlFor="ed-notes">Notas (opcional)</label>
          <textarea id="ed-notes" className="ed-input ed-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        {error && <div className="ob-error">{error}</div>}

        <div className="detail-actions">
          <button type="button" className="action-btn" onClick={closeEdit}>Cancelar</button>
          <button type="submit" className="action-btn action-btn--primary">Salvar</button>
        </div>

        {existing && (
          <button type="button" className="set-lock-btn" style={{ marginTop: 4 }} onClick={remove}>
            Excluir item
          </button>
        )}
      </form>
    </div>
  );
}
