import {
  credKey,
  noteKey,
  tokenKey,
  type Credential,
  type Note,
  type Tombstones,
  type TotpToken,
  type Vault,
} from './types';

/**
 * Preenche campos ausentes ao carregar um cofre (compatibilidade com blobs
 * gravados antes do modelo de sincronização). Nunca lança.
 */
export function normalizeVault(input: Partial<Vault> & { profile: { name: string } }, now = Date.now()): Vault {
  const stampCred = (c: Credential): Credential => ({ ...c, updatedAt: c.updatedAt ?? now });
  const stampToken = (t: TotpToken): TotpToken => ({ ...t, updatedAt: t.updatedAt ?? now });
  const stampNote = (n: Note): Note => ({
    ...n,
    color: n.color ?? 'default',
    pinned: n.pinned ?? false,
    updatedAt: n.updatedAt ?? now,
  });
  return {
    profile: input.profile,
    credentials: (input.credentials ?? []).map(stampCred),
    tokens: (input.tokens ?? []).map(stampToken),
    notes: (input.notes ?? []).map(stampNote),
    tombstones: input.tombstones ?? {},
    updatedAt: input.updatedAt ?? now,
  };
}

function mergeTombstones(a: Tombstones, b: Tombstones): Tombstones {
  const out: Tombstones = { ...a };
  for (const [key, ts] of Object.entries(b)) {
    out[key] = Math.max(out[key] ?? 0, ts);
  }
  return out;
}

/**
 * Combina dois conjuntos de itens por id (last-write-wins pelo updatedAt) e
 * remove os que têm lápide mais recente que a última edição.
 */
function mergeItems<T extends { id: string; updatedAt: number }>(
  a: T[],
  b: T[],
  tombstones: Tombstones,
  keyOf: (id: string) => string,
): T[] {
  const byId = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const current = byId.get(item.id);
    if (!current || item.updatedAt >= current.updatedAt) byId.set(item.id, item);
  }
  const result: T[] = [];
  for (const item of byId.values()) {
    const deletedAt = tombstones[keyOf(item.id)];
    if (deletedAt !== undefined && deletedAt >= item.updatedAt) continue;
    result.push(item);
  }
  // Ordem estável por nome/emissor para uma UI previsível
  return result.sort((x, y) => x.id.localeCompare(y.id));
}

/**
 * Merge determinístico de dois cofres (local × remoto). Comutativo e
 * idempotente: mergeVaults(a, b) e mergeVaults(b, a) produzem o mesmo
 * conjunto de itens. Requer cofres já normalizados.
 */
export function mergeVaults(a: Vault, b: Vault): Vault {
  const tombstones = mergeTombstones(a.tombstones, b.tombstones);
  return {
    profile: a.updatedAt >= b.updatedAt ? a.profile : b.profile,
    credentials: mergeItems<Credential>(a.credentials, b.credentials, tombstones, credKey),
    tokens: mergeItems<TotpToken>(a.tokens, b.tokens, tombstones, tokenKey),
    notes: mergeItems<Note>(a.notes, b.notes, tombstones, noteKey),
    tombstones: pruneTombstones(tombstones),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

/**
 * Descarta lápides antigas (> 90 dias) para o mapa não crescer sem limite.
 * A janela é folgada o bastante para qualquer dispositivo sincronizar antes.
 */
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function pruneTombstones(tombstones: Tombstones, now = Date.now()): Tombstones {
  const out: Tombstones = {};
  for (const [key, ts] of Object.entries(tombstones)) {
    if (now - ts < TOMBSTONE_TTL_MS) out[key] = ts;
  }
  return out;
}
