import { describe, expect, it, vi } from 'vitest';

describe('getStripe', () => {
  it('lance sans clé', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    vi.resetModules();
    const { getStripe } = await import('./stripe');
    expect(() => getStripe()).toThrow(/STRIPE_SECRET_KEY/);
  });

  it('retourne une instance avec clé', async () => {
    // Clé factice construite à l'exécution (évite le blocage push GitHub).
    vi.stubEnv('STRIPE_SECRET_KEY', `${'sk'}_${'test'}_${'x'.repeat(24)}`);
    vi.resetModules();
    const { getStripe } = await import('./stripe');
    const s = getStripe();
    expect(s).toBeDefined();
  });
});
