export type Strength = 'strong' | 'medium' | 'weak';

export type StrengthMeta = {
  color: string;
  label: 'Forte' | 'Média' | 'Fraca';
  bars: 1 | 2 | 4;
};

const META: Record<Strength, StrengthMeta> = {
  strong: { color: '#34d399', label: 'Forte', bars: 4 },
  medium: { color: '#fbbf24', label: 'Média', bars: 2 },
  weak: { color: '#fb7185', label: 'Fraca', bars: 1 },
};

export function strengthMeta(strength: Strength): StrengthMeta {
  return META[strength];
}

/**
 * Estimativa heurística da força de uma senha armazenada.
 * (Em produção, considerar zxcvbn para análise mais rica.)
 */
export function estimateStrength(password: string): Strength {
  const sets =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^a-zA-Z0-9]/.test(password));
  const hasCommonPattern = /^(?:[a-z]+|[A-Z]+|[0-9]+)$/.test(password) || /(?:123|abc|senha|password)/i.test(password);

  if (password.length >= 14 && sets >= 3 && !hasCommonPattern) return 'strong';
  if (password.length >= 10 && sets >= 2) return 'medium';
  return 'weak';
}
