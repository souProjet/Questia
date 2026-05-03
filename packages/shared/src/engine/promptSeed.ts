/**
 * Index déterministe dans [0, modulo) pour tirages de prompts (FNV-1a 32 bits).
 * Même graine + même sel → même index (reproductible par jour / utilisateur).
 */
export function promptSeedIndex(seed: string, salt: string, modulo: number): number {
  if (modulo <= 1) return 0;
  let h = 2166136261;
  const s = `${seed}|${salt}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % modulo;
}

/** Tirage déterministe reproductible (fallback taxonomie, archétype « stats »). */
export function pickDeterministicFromPool<T>(items: readonly T[], seed: string, salt: string): T | null {
  if (items.length === 0) return null;
  const idx = promptSeedIndex(seed, salt, items.length);
  return items[idx]!;
}
