type ToggleProps = {
  on: boolean;
  onToggle: () => void;
  /** Track ativo: 'accent' (roxo) ou 'success' (verde, biometria). */
  variant?: 'accent' | 'success';
};

/** Toggle 46×28px, knob branco 22px; track ativo em gradiente. */
export function Toggle({ on, onToggle, variant = 'accent' }: ToggleProps) {
  const activeTrack =
    variant === 'success'
      ? 'linear-gradient(145deg,#34d399,#0a9d6c)'
      : 'var(--accent-grad)';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        padding: 3,
        border: 'none',
        cursor: 'pointer',
        background: on ? activeTrack : 'rgba(255,255,255,.1)',
        transition: 'background .2s',
        display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start',
        flex: '0 0 auto',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 2px 5px rgba(0,0,0,.3)',
        }}
      />
    </button>
  );
}
