import { describe, expect, it, vi } from 'vitest';
import { sendExpoPushMessages } from './expo-push';

describe('sendExpoPushMessages', () => {
  it('retourne ok si vide', async () => {
    expect(await sendExpoPushMessages([])).toEqual({ ok: true });
  });

  it('ok HTTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ status: 'ok' }] }),
      }),
    );
    const r = await sendExpoPushMessages([{ to: 't', title: 'x', body: 'y' }]);
    expect(r.ok).toBe(true);
  });

  it('erreur HTTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ err: true }),
      }),
    );
    const r = await sendExpoPushMessages([{ to: 't', title: 'x', body: 'y' }]);
    expect(r.ok).toBe(false);
  });

  it('erreurs par message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ status: 'error', message: 'bad' }],
        }),
      }),
    );
    const r = await sendExpoPushMessages([{ to: 't', title: 'x', body: 'y' }]);
    expect(r.ok).toBe(false);
    expect(r.errors?.[0]).toBe('bad');
  });
});
