type CountdownRingProps = {
  /** Diâmetro total em px (ex.: 34, 42). */
  size: number;
  /** Fração restante do período (0..1). */
  frac: number;
  /** Segundos restantes, exibidos no centro. */
  remaining: number;
  color: string;
  strokeWidth?: number;
  fontSize?: number;
};

/** Anel de contagem TOTP: esvazia conforme o tempo (stroke-dashoffset proporcional). */
export function CountdownRing({ size, frac, remaining, color, strokeWidth = 3, fontSize = 12 }: CountdownRingProps) {
  const r = size / 2 - strokeWidth - 0.5;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - frac);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={strokeWidth} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          fontWeight: 700,
          color,
        }}
      >
        {remaining}
      </div>
    </div>
  );
}

/** Cor semântica do anel/código conforme os segundos restantes. */
export function ringColor(remaining: number): string {
  if (remaining > 10) return 'var(--accent)';
  if (remaining > 5) return 'var(--warning)';
  return 'var(--danger)';
}
