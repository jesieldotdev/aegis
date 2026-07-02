import { useState, type FormEvent } from 'react';
import { AegisLogo, IconEye, IconEyeOff } from '@aegis/ui';
import { estimateStrength, strengthMeta } from '@aegis/core';
import { useApp } from '../store';

/** Primeira execução: cria o cofre e define a senha-mestra. */
export function Onboarding() {
  const { createVault } = useApp();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [seedDemo, setSeedDemo] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const meta = password ? strengthMeta(estimateStrength(password)) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('A senha-mestra precisa de pelo menos 8 caracteres');
    if (password !== confirm) return setError('As senhas não coincidem');
    setError('');
    setCreating(true);
    try {
      await createVault(name, password, seedDemo);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="lock onboarding">
      <AegisLogo size={72} iconSize={36} radius={22} />
      <div className="lock-name" style={{ marginTop: 22 }}>Criar seu cofre</div>
      <div className="lock-subtitle">
        A senha-mestra cifra tudo neste dispositivo — ela não pode ser recuperada
      </div>

      <form className="ob-form" onSubmit={submit}>
        <div className="ob-field">
          <label className="field-label" htmlFor="ob-name">Seu nome</label>
          <input
            id="ob-name"
            className="ob-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como devemos te chamar?"
            autoComplete="name"
          />
        </div>

        <div className="ob-field">
          <label className="field-label" htmlFor="ob-pass">Senha-mestra</label>
          <div className="ob-input ob-input--row">
            <input
              id="ob-pass"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            <button type="button" className="ob-eye" onClick={() => setShow((s) => !s)} aria-label="Mostrar senha">
              {show ? <IconEyeOff size={17} /> : <IconEye size={17} />}
            </button>
          </div>
          {meta && (
            <div className="ob-strength">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="strength-bar" style={meta.bars >= n ? { background: meta.color } : undefined} />
              ))}
            </div>
          )}
        </div>

        <div className="ob-field">
          <label className="field-label" htmlFor="ob-confirm">Confirmar senha</label>
          <input
            id="ob-confirm"
            className="ob-input"
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(''); }}
            placeholder="Repita a senha-mestra"
            autoComplete="new-password"
          />
        </div>

        <label className="ob-demo">
          <input type="checkbox" checked={seedDemo} onChange={(e) => setSeedDemo(e.target.checked)} />
          Começar com dados de exemplo
        </label>

        {error && <div className="ob-error">{error}</div>}

        <button type="submit" className="ob-submit" disabled={creating}>
          {creating ? 'Cifrando cofre…' : 'Criar cofre'}
        </button>
      </form>
    </div>
  );
}
