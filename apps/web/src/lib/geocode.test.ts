import { beforeEach, describe, expect, it, vi } from 'vitest';
import { geocodeNominatim } from './geocode';

describe('geocodeNominatim', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retourne null pour requête vide', async () => {
    expect(await geocodeNominatim('  ')).toBeNull();
  });

  it('parse la première réponse Nominatim', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ lat: '48.85', lon: '2.35' }],
      }),
    );
    const r = await geocodeNominatim('Paris');
    expect(r).toEqual({ lat: 48.85, lon: 2.35 });
  });

  it('null si HTTP non ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await geocodeNominatim('x')).toBeNull();
  });

  it('null si fetch lève', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await geocodeNominatim('Paris')).toBeNull();
  });

  it('null si tableau vide ou coords invalides', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }),
    );
    expect(await geocodeNominatim('x')).toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ lat: 'nan', lon: '2' }],
      }),
    );
    expect(await geocodeNominatim('x')).toBeNull();
  });
});
