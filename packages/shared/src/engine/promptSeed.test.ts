import { describe, expect, it } from 'vitest';
import { promptSeedIndex } from './promptSeed';

describe('promptSeedIndex', () => {
  it('reste dans [0, modulo) et est stable pour une même entrée', () => {
    expect(promptSeedIndex('a', 'b', 7)).toBe(promptSeedIndex('a', 'b', 7));
    const x = promptSeedIndex('user:2026-04-10', 'creative', 20);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(20);
  });

  it('diffère si le sel change', () => {
    const mod = 100;
    expect(promptSeedIndex('same', 'creative', mod)).not.toBe(promptSeedIndex('same', 'pivot', mod));
  });

  it('modulo <= 1 retourne 0', () => {
    expect(promptSeedIndex('x', 'y', 0)).toBe(0);
    expect(promptSeedIndex('x', 'y', 1)).toBe(0);
  });
});
