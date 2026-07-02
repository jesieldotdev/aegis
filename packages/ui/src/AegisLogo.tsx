type AegisLogoProps = {
  /** Tamanho do quadrado do logo, em px. */
  size?: number;
  /** Tamanho do ícone interno, em px. */
  iconSize?: number;
  radius?: number;
  shadow?: boolean;
};

/** Logo Aegis: escudo com check sobre gradiente roxo (placeholder da marca). */
export function AegisLogo({ size = 52, iconSize = 26, radius = 15, shadow = true }: AegisLogoProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'var(--accent-grad)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        boxShadow: shadow
          ? '0 8px 30px rgba(124,58,237,.5), inset 0 1px 0 rgba(255,255,255,.35)'
          : undefined,
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2.5l7 3v5.5c0 4.6-3 8.4-7 9.9-4-1.5-7-5.3-7-9.9V5.5l7-3z"
          fill="#fff"
          fillOpacity=".18"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M9 11.8l2.1 2.1L15.2 9.5"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
