import { IconCopy, IconRefresh, Toggle } from '@aegis/ui';
import { generatedStrength, type GeneratorOptions } from '@aegis/core';
import { useApp } from '../store';

/** Senha com números em azul e símbolos em verde, como no design. */
function ColoredPassword({ value }: { value: string }) {
  return (
    <div className="gen-password">
      {value.split('').map((ch, i) => {
        const cls = /[0-9]/.test(ch) ? 'gen-char--num' : /[^a-zA-Z0-9]/.test(ch) ? 'gen-char--sym' : undefined;
        return (
          <span key={i} className={cls}>
            {ch}
          </span>
        );
      })}
    </div>
  );
}

const TOGGLES: { key: keyof GeneratorOptions; label: string }[] = [
  { key: 'upper', label: 'Letras maiúsculas (A-Z)' },
  { key: 'lower', label: 'Letras minúsculas (a-z)' },
  { key: 'numbers', label: 'Números (0-9)' },
  { key: 'symbols', label: 'Símbolos (!@#$)' },
];

export function Generator() {
  const { genOpts, genPass, setGenOpts, regen, copy } = useApp();
  const strength = generatedStrength(genOpts);

  return (
    <div className="screen screen--scroll">
      <div className="screen-header">
        <div className="screen-title">Gerador</div>
        <div className="screen-subtitle">Crie senhas fortes e únicas</div>
      </div>

      <div className="gen-body">
        <div className="gen-display">
          <ColoredPassword value={genPass} />
          <div className="gen-display-actions">
            <button type="button" className="gen-btn" onClick={regen}>
              <IconRefresh size={17} />
              Gerar
            </button>
            <button type="button" className="gen-btn gen-btn--primary" onClick={() => copy('Senha gerada', genPass)}>
              <IconCopy size={17} />
              Copiar
            </button>
          </div>
        </div>

        <div className="gen-strength">
          <div className="gen-strength-bars">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="gen-strength-bar"
                style={strength.score >= n ? { background: strength.color } : undefined}
              />
            ))}
          </div>
          <span className="gen-strength-label" style={{ color: strength.color }}>
            {strength.label}
          </span>
        </div>

        <div className="gen-mode">
          <button
            type="button"
            className={`gen-mode-btn${genOpts.mode === 'chars' ? ' gen-mode-btn--active' : ''}`}
            onClick={() => setGenOpts({ mode: 'chars' })}
          >
            Caracteres
          </button>
          <button
            type="button"
            className={`gen-mode-btn${genOpts.mode === 'words' ? ' gen-mode-btn--active' : ''}`}
            onClick={() => setGenOpts({ mode: 'words' })}
          >
            Palavras
          </button>
        </div>

        <div className="gen-card">
          <div className="gen-len-row">
            <span className="gen-len-title">Comprimento</span>
            <span className="gen-len-value">{genOpts.length}</span>
          </div>
          <input
            type="range"
            min={8}
            max={40}
            value={genOpts.length}
            onChange={(e) => setGenOpts({ length: Number(e.target.value) })}
            className="gen-slider"
            aria-label="Comprimento da senha"
          />
        </div>

        <div className="gen-toggles">
          {TOGGLES.map((t) => (
            <div
              key={t.key}
              className="gen-toggle-row"
              onClick={() => setGenOpts({ [t.key]: !genOpts[t.key] })}
            >
              <span className="gen-toggle-label">{t.label}</span>
              <Toggle on={Boolean(genOpts[t.key])} onToggle={() => setGenOpts({ [t.key]: !genOpts[t.key] })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
