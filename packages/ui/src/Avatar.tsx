type AvatarProps = {
  /** CSS background (gradiente 145deg do serviço). */
  color: string;
  initial: string;
  size?: number;
  radius?: number;
  fontSize?: number;
  shadow?: boolean;
};

/** Avatar de item: quadrado arredondado com gradiente e inicial branca (Sora 700). */
export function Avatar({ color, initial, size = 46, radius = 13, fontSize = 19, shadow = true }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize,
        color: '#fff',
        background: color,
        boxShadow: shadow ? '0 4px 12px rgba(0,0,0,.35)' : undefined,
      }}
    >
      {initial}
    </div>
  );
}
