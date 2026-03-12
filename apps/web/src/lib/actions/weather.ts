'use server';

import type { WeatherCheck } from '@quetes/shared';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY ?? '';
const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';

interface WeatherApiResponse {
  main: { temp: number };
  wind: { speed: number };
  rain?: { '1h'?: number };
  snow?: { '1h'?: number };
  alerts?: Array<{ event: string; description: string }>;
}

export async function checkWeatherSafety(lat: number, lon: number): Promise<WeatherCheck> {
  if (!OPENWEATHER_API_KEY) {
    return { safe: true, temperature: 20, alerts: [], windSpeed: 0, precipitation: 0 };
  }

  try {
    const res = await fetch(
      `${OPENWEATHER_BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`,
      { next: { revalidate: 1800 } },
    );

    if (!res.ok) {
      return { safe: true, temperature: 20, alerts: [], windSpeed: 0, precipitation: 0 };
    }

    const data: WeatherApiResponse = await res.json();
    const temperature = data.main.temp;
    const windSpeed = data.wind.speed;
    const precipitation = (data.rain?.['1h'] ?? 0) + (data.snow?.['1h'] ?? 0);
    const alerts = data.alerts?.map((a) => a.event) ?? [];

    const safe =
      temperature > -5 &&
      temperature < 42 &&
      windSpeed < 20 &&
      precipitation < 10 &&
      alerts.length === 0;

    return { safe, temperature, alerts, windSpeed, precipitation };
  } catch {
    return { safe: true, temperature: 20, alerts: [], windSpeed: 0, precipitation: 0 };
  }
}
