'use server';

import type { WeatherCheck } from '@questia/shared';
import { logStructured, logStructuredError } from '../observability';
import type { QuestContext } from './ai';

const KEY = process.env.OPENWEATHER_API_KEY ?? '';
const BASE = 'https://api.openweathermap.org/data/2.5';

interface OWMResponse {
  name: string;
  sys: { country: string };
  main: { temp: number; feels_like: number };
  wind: { speed: number };
  weather: Array<{ main: string; description: string; id: number }>;
  rain?: { '1h'?: number };
  snow?: { '1h'?: number };
  alerts?: Array<{ event: string }>;
}

function weatherIconName(main: string, temp: number): string {
  if (main === 'Thunderstorm') return 'CloudLightning';
  if (main === 'Snow' || temp < 0) return 'CloudSnow';
  if (main === 'Rain' || main === 'Drizzle') return 'CloudRain';
  if (main === 'Fog' || main === 'Mist' || main === 'Haze') return 'CloudFog';
  if (main === 'Clouds') return 'Cloud';
  if (main === 'Clear') return temp > 25 ? 'Sun' : 'CloudSun';
  return 'CloudSun';
}

function frenchDescription(main: string, description: string): string {
  const map: Record<string, string> = {
    'clear sky': 'Ciel dégagé',
    'few clouds': 'Quelques nuages',
    'scattered clouds': 'Nuages épars',
    'broken clouds': 'Nuageux',
    'overcast clouds': 'Couvert',
    'light rain': 'Pluie légère',
    'moderate rain': 'Pluie modérée',
    'heavy intensity rain': 'Pluie forte',
    'light snow': 'Neige légère',
    'thunderstorm': 'Orage',
    'mist': 'Brume',
    'fog': 'Brouillard',
  };
  return map[description.toLowerCase()] ?? description;
}

export async function checkWeatherSafety(lat: number, lon: number): Promise<WeatherCheck> {
  const t0 = performance.now();
  if (!KEY) {
    logStructured({
      domain: 'weather',
      operation: 'owm.safety',
      level: 'info',
      outcome: 'skipped',
      meta: { reason: 'no_api_key' },
    });
    return { safe: true, temperature: 20, alerts: [], windSpeed: 0, precipitation: 0 };
  }
  try {
    const res = await fetch(
      `${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${KEY}`,
      { next: { revalidate: 1800 } },
    );
    const durationMs = Math.round(performance.now() - t0);
    if (!res.ok) {
      logStructured({
        domain: 'weather',
        operation: 'owm.safety',
        level: 'warn',
        outcome: 'fallback',
        durationMs,
        meta: { httpStatus: res.status },
      });
      return { safe: true, temperature: 20, alerts: [], windSpeed: 0, precipitation: 0 };
    }

    const d: OWMResponse = await res.json();
    const temperature = d.main.temp;
    const windSpeed = d.wind.speed;
    const precipitation = (d.rain?.['1h'] ?? 0) + (d.snow?.['1h'] ?? 0);
    const alerts = d.alerts?.map((a) => a.event) ?? [];
    const safe = temperature > -5 && temperature < 42 && windSpeed < 20 && precipitation < 10 && alerts.length === 0;
    logStructured({
      domain: 'weather',
      operation: 'owm.safety',
      level: 'info',
      outcome: 'ok',
      durationMs,
      meta: {
        httpStatus: res.status,
        weatherMain: d.weather[0]?.main ?? 'unknown',
        safe,
      },
    });
    return { safe, temperature, alerts, windSpeed, precipitation };
  } catch (err) {
    const durationMs = Math.round(performance.now() - t0);
    logStructuredError('weather', 'owm.safety', err, {
      durationMs,
      outcome: 'fallback',
    });
    return { safe: true, temperature: 20, alerts: [], windSpeed: 0, precipitation: 0 };
  }
}

function hasValidUserCoords(lat?: number, lon?: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
  );
}

/** Full weather + location context for quest generation */
export async function getQuestContext(lat?: number, lon?: number): Promise<QuestContext> {
  const t0 = performance.now();
  const hasUserLocation = hasValidUserCoords(lat, lon);

  if (!hasUserLocation) {
    logStructured({
      domain: 'weather',
      operation: 'owm.questContext',
      level: 'info',
      outcome: 'skipped',
      durationMs: Math.round(performance.now() - t0),
      meta: {
        hasCoords: false,
        hasApiKey: Boolean(KEY),
      },
    });
    return {
      city: 'ta ville',
      country: '',
      weatherDescription: 'Variable',
      weatherIcon: 'CloudSun',
      temp: 18,
      isOutdoorFriendly: true,
      hasUserLocation: false,
    };
  }

  if (!KEY) {
    logStructured({
      domain: 'weather',
      operation: 'owm.questContext',
      level: 'info',
      outcome: 'skipped',
      durationMs: Math.round(performance.now() - t0),
      meta: {
        hasCoords: true,
        hasApiKey: false,
      },
    });
    return {
      city: 'ta ville',
      country: '',
      weatherDescription: 'Variable',
      weatherIcon: 'CloudSun',
      temp: 18,
      isOutdoorFriendly: true,
      hasUserLocation: true,
    };
  }
  try {
    const res = await fetch(
      `${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${KEY}`,
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) {
      const durationMs = Math.round(performance.now() - t0);
      logStructured({
        domain: 'weather',
        operation: 'owm.questContext',
        level: 'warn',
        outcome: 'fallback',
        durationMs,
        meta: { httpStatus: res.status },
      });
      throw new Error('fetch failed');
    }

    const d: OWMResponse = await res.json();
    const main = d.weather[0]?.main ?? 'Clear';
    const description = d.weather[0]?.description ?? 'Variable';
    const temp = d.main.temp;
    const wind = d.wind.speed;
    const precip = (d.rain?.['1h'] ?? 0) + (d.snow?.['1h'] ?? 0);

    const isOutdoorFriendly =
      temp > 0 && temp < 40 && wind < 15 && precip < 5
      && !['Thunderstorm', 'Snow'].includes(main);

    const durationMs = Math.round(performance.now() - t0);
    logStructured({
      domain: 'weather',
      operation: 'owm.questContext',
      level: 'info',
      outcome: 'ok',
      durationMs,
      meta: {
        httpStatus: res.status,
        weatherMain: main,
        isOutdoorFriendly,
        tempBucket: temp < 5 ? 'cold' : temp > 30 ? 'hot' : 'mild',
      },
    });

    return {
      city: d.name || 'ta ville',
      country: d.sys.country || '',
      weatherDescription: frenchDescription(main, description),
      weatherIcon: weatherIconName(main, temp),
      temp,
      isOutdoorFriendly,
      hasUserLocation: true,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - t0);
    if (err instanceof Error && err.message === 'fetch failed') {
      return {
        city: 'ta ville',
        country: '',
        weatherDescription: 'Variable',
        weatherIcon: 'CloudSun',
        temp: 18,
        isOutdoorFriendly: true,
        hasUserLocation: true,
      };
    }
    logStructuredError('weather', 'owm.questContext', err, {
      durationMs,
      outcome: 'fallback',
    });
    return {
      city: 'ta ville',
      country: '',
      weatherDescription: 'Variable',
      weatherIcon: 'CloudSun',
      temp: 18,
      isOutdoorFriendly: true,
      hasUserLocation: true,
    };
  }
}
