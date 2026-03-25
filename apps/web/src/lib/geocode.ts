import { logStructured, logStructuredError } from './observability';

/**
 * Géocodage via Nominatim (OSM). Usage raisonné côté serveur uniquement.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */
export async function geocodeNominatim(query: string): Promise<{ lat: number; lon: number } | null> {
  const q = query.trim();
  const t0 = performance.now();
  const queryCharCount = q.length;
  if (!q) {
    logStructured({
      domain: 'geo',
      operation: 'nominatim.search',
      level: 'info',
      outcome: 'skipped',
      meta: { queryCharCount: 0 },
    });
    return null;
  }
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Questia/1.0 (daily quest; +https://github.com/souProjet/Questia)',
        'Accept-Language': 'fr',
      },
      cache: 'no-store',
    });
    const durationMs = Math.round(performance.now() - t0);
    if (!res.ok) {
      logStructured({
        domain: 'geo',
        operation: 'nominatim.search',
        level: 'warn',
        outcome: 'miss',
        durationMs,
        meta: { queryCharCount, httpStatus: res.status },
      });
      return null;
    }
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    if (!Array.isArray(data) || data.length === 0) {
      logStructured({
        domain: 'geo',
        operation: 'nominatim.search',
        level: 'info',
        outcome: 'miss',
        durationMs,
        meta: { queryCharCount, httpStatus: res.status, emptyResults: true },
      });
      return null;
    }
    const lat = parseFloat(data[0].lat ?? '');
    const lon = parseFloat(data[0].lon ?? '');
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      logStructured({
        domain: 'geo',
        operation: 'nominatim.search',
        level: 'warn',
        outcome: 'miss',
        durationMs,
        meta: { queryCharCount, httpStatus: res.status, parseError: true },
      });
      return null;
    }
    logStructured({
      domain: 'geo',
      operation: 'nominatim.search',
      level: 'info',
      outcome: 'ok',
      durationMs,
      meta: { queryCharCount, httpStatus: res.status },
    });
    return { lat, lon };
  } catch (err) {
    const durationMs = Math.round(performance.now() - t0);
    logStructuredError('geo', 'nominatim.search', err, {
      durationMs,
      outcome: 'degraded',
      meta: { queryCharCount },
    });
    return null;
  }
}
