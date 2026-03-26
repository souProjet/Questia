import { beforeEach, describe, expect, it, vi } from 'vitest';
import { geocodeNominatim, shortenDisplayName } from './geocode';

describe('shortenDisplayName', () => {
  it('tronque les libellés longs', () => {
    const long = `${'A'.repeat(100)}, B, C`;
    expect(shortenDisplayName(long, 40)).toMatch(/…$/);
  });

  it('garde les deux premiers segments courts', () => {
    expect(shortenDisplayName('Place Bellecour, Lyon')).toBe('Place Bellecour, Lyon');
  });
});

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
        json: async () => [
          { lat: '48.85', lon: '2.35', display_name: 'Paris, France' },
        ],
      }),
    );
    const r = await geocodeNominatim('Paris');
    expect(r).toEqual({ lat: 48.85, lon: 2.35, displayName: 'Paris, France' });
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

  it('retente sans viewbox si la première requête est vide', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: '45.5', lon: '4.5', display_name: 'Ville, FR' }],
      });
    vi.stubGlobal('fetch', fetchMock);

    const r = await geocodeNominatim('Ville', { nearLat: 45.5, nearLon: 4.5 });
    expect(r).toEqual({ lat: 45.5, lon: 4.5, displayName: 'Ville, FR' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
