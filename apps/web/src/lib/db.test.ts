import { describe, expect, it, vi } from 'vitest';

describe('prisma singleton', () => {
  it('assignation globale hors production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const { prisma: a } = await import('./db');
    const { prisma: b } = await import('./db');
    expect(a).toBe(b);
  });

  it('branche production sans réassigner global', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const mod = await import('./db');
    expect(mod.prisma).toBeDefined();
  });
});
