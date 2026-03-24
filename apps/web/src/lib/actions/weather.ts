'use server';

import type { WeatherCheck } from '@questia/shared';
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
  if (!KEY) return { safe: true, temperature: 20, alerts: [], windSpeed: 0, precipitation: 0 };
  try {
    const res = await fetch(
      `${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${KEY}`,
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) return { safe: true, temperature: 20, alerts: [], windSpeed: 0, precipitation: 0 };

    const d: OWMResponse = await res.json();
    const temperature = d.main.temp;
    const windSpeed = d.wind.speed;
    const precipitation = (d.rain?.['1h'] ?? 0) + (d.snow?.['1h'] ?? 0);
    const alerts = d.alerts?.map((a) => a.event) ?? [];
    const safe = temperature > -5 && temperature < 42 && windSpeed < 20 && precipitation < 10 && alerts.length === 0;
    return { safe, temperature, alerts, windSpeed, precipitation };
  } catch {
    return { safe: true, temperature: 20, alerts: [], windSpeed: 0, precipitation: 0 };
  }
}

/** Full weather + location context for quest generation */
export async function getQuestContext(lat?: number, lon?: number): Promise<QuestContext> {
  if (!lat || !lon || !KEY) {
    return {
      city: 'ta ville',
      country: '',
      weatherDescription: 'Variable',
      weatherIcon: 'CloudSun',
      temp: 18,
      isOutdoorFriendly: true,
    };
  }
  try {
    const res = await fetch(
      `${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${KEY}`,
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) throw new Error('fetch failed');

    const d: OWMResponse = await res.json();
    const main = d.weather[0]?.main ?? 'Clear';
    const description = d.weather[0]?.description ?? 'Variable';
    const temp = d.main.temp;
    const wind = d.wind.speed;
    const precip = (d.rain?.['1h'] ?? 0) + (d.snow?.['1h'] ?? 0);

    const isOutdoorFriendly =
      temp > 0 && temp < 40 && wind < 15 && precip < 5
      && !['Thunderstorm', 'Snow'].includes(main);

    return {
      city: d.name || 'ta ville',
      country: d.sys.country || '',
      weatherDescription: frenchDescription(main, description),
      weatherIcon: weatherIconName(main, temp),
      temp,
      isOutdoorFriendly,
    };
  } catch {
    return { city: 'ta ville', country: '', weatherDescription: 'Variable', weatherIcon: 'CloudSun', temp: 18, isOutdoorFriendly: true };
  }
}
