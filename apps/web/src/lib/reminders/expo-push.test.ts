import { describe, expect, it, vi } from 'vitest';
import { sendExpoPushMessages } from './expo-push';

describe('sendExpoPushMessages', () => {
  it('retourne ok si vide', async () => {
    expect(await sendExpoPushMessages([])).toEqual({ ok: true });
  });

  it('ok HTTP — un message : corps = objet racine (pas { messages })', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const r = await sendExpoPushMessages([{ to: 'ExponentPushToken[a]', title: 'x', body: 'y' }]);
    expect(r.ok).toBe(true);
    const body = (fetchMock.mock.calls[0]?.[1] as { body?: string })?.body;
    expect(body).toBe(JSON.stringify({ to: 'ExponentPushToken[a]', title: 'x', body: 'y' }));
  });

  it('ok HTTP — plusieurs messages : corps = tableau racine', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok' }, { status: 'ok' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const msgs = [
      { to: 'ExponentPushToken[a]', title: 'x', body: 'y' },
      { to: 'ExponentPushToken[b]', title: 'x', body: 'y' },
    ];
    const r = await sendExpoPushMessages(msgs);
    expect(r.ok).toBe(true);
    const body = (fetchMock.mock.calls[0]?.[1] as { body?: string })?.body;
    expect(body).toBe(JSON.stringify(msgs));
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
