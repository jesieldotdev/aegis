export type AvatarStyle = { color: string; initial: string };

/** Avatares dos itens de demonstração (gradientes 145deg, iniciais brancas). */
export const AVATAR_STYLES: Record<string, AvatarStyle> = {
  google: { color: 'linear-gradient(145deg,#4285F4,#1a56c4)', initial: 'G' },
  github: { color: 'linear-gradient(145deg,#3a3f47,#16181d)', initial: 'Gh' },
  nubank: { color: 'linear-gradient(145deg,#a05fe6,#7211a8)', initial: 'Nu' },
  figma: { color: 'linear-gradient(145deg,#f24e1e,#c43410)', initial: 'Fi' },
  netflix: { color: 'linear-gradient(145deg,#e50914,#8a0009)', initial: 'N' },
  spotify: { color: 'linear-gradient(145deg,#1db954,#0a7d38)', initial: 'Sp' },
  amazon: { color: 'linear-gradient(145deg,#ff9900,#c46f00)', initial: 'Az' },
  instagram: { color: 'linear-gradient(145deg,#e1306c,#833ab4)', initial: 'Ig' },
  binance: { color: 'linear-gradient(145deg,#f0b90b,#a37c00)', initial: 'Bn' },
  acme: { color: 'linear-gradient(145deg,#2563eb,#1e40af)', initial: 'A' },
};

/** Paleta para itens criados pelo usuário (mesma linguagem visual da demo). */
const PALETTE = [
  'linear-gradient(145deg,#a78bfa,#7c3aed)',
  'linear-gradient(145deg,#4285F4,#1a56c4)',
  'linear-gradient(145deg,#34d399,#0a9d6c)',
  'linear-gradient(145deg,#f24e1e,#c43410)',
  'linear-gradient(145deg,#e1306c,#833ab4)',
  'linear-gradient(145deg,#f0b90b,#a37c00)',
  'linear-gradient(145deg,#1db954,#0a7d38)',
  'linear-gradient(145deg,#5e7be6,#2b3f9e)',
  'linear-gradient(145deg,#fb7185,#be123c)',
  'linear-gradient(145deg,#2563eb,#1e40af)',
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) {
    const w = words[0];
    return w.length > 1 ? w[0].toUpperCase() + w[1].toLowerCase() : w[0].toUpperCase();
  }
  return words[0][0].toUpperCase() + words[1][0].toLowerCase();
}

/** Avatar de um item: estilo fixo para os itens demo, gerado por hash para os demais. */
export function avatarFor(id: string, name: string): AvatarStyle {
  const fixed = AVATAR_STYLES[id];
  if (fixed) return fixed;
  return { color: PALETTE[hash(name || id) % PALETTE.length], initial: initialsOf(name) };
}
