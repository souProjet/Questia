import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('weather actions', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('checkWeatherSafety sans clé API → safe', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', '');
    vi.resetModules();
    const { checkWeatherSafety } = await import('./weather');
    const r = await checkWeatherSafety(48.8, 2.3);
    expect(r.safe).toBe(true);
  });

  it('checkWeatherSafety parse météo défavorable', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'k');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          main: { temp: -10, feels_like: -10 },
          wind: { speed: 25 },
          weather: [{ main: 'Clear', description: 'clear sky', id: 800 }],
          sys: { country: 'FR' },
          name: 'Paris',
        }),
      }),
    );
    vi.resetModules();
    const { checkWeatherSafety } = await import('./weather');
    const r = await checkWeatherSafety(1, 2);
    expect(r.safe).toBe(false);
  });

  it('getQuestContext sans coords', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', '');
    vi.resetModules();
    const { getQuestContext } = await import('./weather');
    const c = await getQuestContext();
    expect(c.city).toBe('ta ville');
    expect(c.isOutdoorFriendly).toBe(true);
  });

  it('getQuestContext avec météo OK', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'k');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          main: { temp: 20, feels_like: 20 },
          wind: { speed: 5 },
          weather: [{ main: 'Clear', description: 'clear sky', id: 800 }],
          sys: { country: 'FR' },
          name: 'Lyon',
        }),
      }),
    );
    vi.resetModules();
    const { getQuestContext } = await import('./weather');
    const c = await getQuestContext(45, 5);
    expect(c.city).toBe('Lyon');
    expect(['Sun', 'CloudSun']).toContain(c.weatherIcon);
  });

  it('getQuestContext fetch échoue → défaut', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'k');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    vi.resetModules();
    const { getQuestContext } = await import('./weather');
    const c = await getQuestContext(1, 2);
    expect(c.weatherDescription).toBe('Variable');
  });
});
