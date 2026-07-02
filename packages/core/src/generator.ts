export type GeneratorMode = 'chars' | 'words';

export type GeneratorOptions = {
  mode: GeneratorMode;
  length: number;
  upper: boolean;
  lower: boolean;
  numbers: boolean;
  symbols: boolean;
};

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  mode: 'chars',
  length: 20,
  upper: true,
  lower: true,
  numbers: true,
  symbols: true,
};

// Conjuntos sem caracteres ambíguos (l/1, O/0…)
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const NUMBERS = '23456789';
const SYMBOLS = '!@#$%^&*-_=+';

const WORDS = [
  'tigre', 'nuvem', 'pedra', 'fogo', 'vento', 'lua', 'sol', 'mar',
  'ouro', 'ferro', 'neve', 'trovao', 'raiz', 'folha', 'gelo', 'rio',
  'campo', 'serra', 'brisa', 'chama', 'onda', 'rocha', 'areia', 'flor',
];

/** Inteiro aleatório uniforme em [0, max) via CSPRNG com rejection sampling. */
function randomInt(max: number): number {
  const range = 0x100000000;
  const limit = range - (range % max);
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function pick(str: string): string {
  return str[randomInt(str.length)];
}

/** Gera uma senha forte usando crypto.getRandomValues. */
export function generatePassword(opts: GeneratorOptions): string {
  if (opts.mode === 'words') {
    const parts: string[] = [];
    for (let i = 0; i < 4; i++) parts.push(WORDS[randomInt(WORDS.length)]);
    let out = parts.join('-');
    if (opts.numbers) out += '-' + (10 + randomInt(90));
    return out;
  }

  const sets: string[] = [];
  if (opts.lower) sets.push(LOWER);
  if (opts.upper) sets.push(UPPER);
  if (opts.numbers) sets.push(NUMBERS);
  if (opts.symbols) sets.push(SYMBOLS);
  if (sets.length === 0) sets.push(LOWER);

  const all = sets.join('');
  const length = Math.max(opts.length, sets.length);
  const chars: string[] = [];
  // Garante ao menos um caractere de cada conjunto ativo
  for (const set of sets) chars.push(pick(set));
  while (chars.length < length) chars.push(pick(all));
  // Embaralha (Fisher-Yates com CSPRNG)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export type GeneratedStrength = {
  score: 1 | 2 | 3 | 4;
  label: 'Fraca' | 'Média' | 'Boa' | 'Excelente';
  color: string;
};

/** Classifica a força da senha gerada conforme as opções ativas. */
export function generatedStrength(opts: GeneratorOptions): GeneratedStrength {
  let score: 1 | 2 | 3 | 4;
  if (opts.mode === 'words') {
    score = opts.numbers ? 4 : 3;
  } else {
    const sets = [opts.lower, opts.upper, opts.numbers, opts.symbols].filter(Boolean).length;
    if (opts.length >= 16 && sets >= 3) score = 4;
    else if (opts.length >= 12 && sets >= 2) score = 3;
    else if (opts.length >= 8) score = 2;
    else score = 1;
  }
  const map = {
    1: { label: 'Fraca', color: '#fb7185' },
    2: { label: 'Média', color: '#fbbf24' },
    3: { label: 'Boa', color: '#a3e635' },
    4: { label: 'Excelente', color: '#34d399' },
  } as const;
  return { score, ...map[score] };
}
