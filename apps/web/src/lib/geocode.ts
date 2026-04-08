import { logStructured, logStructuredError } from './observability';

export type GeocodeResult = {
  lat: number;
  lon: number;
  /** Libellé lisible renvoyé par Nominatim (ex. « Place X, Ville »). */
  displayName: string | null;
};

export type GeocodeOptions = {
  /** Favorise un résultat près de ce point (zone ~±0,5° par défaut). */
  nearLat?: number;
  nearLon?: number;
  /** Demi-côté de la viewbox en degrés (ex. 0,32 ≈ zone locale ; 1,1 ≈ grande région). */
  viewboxDeltaDeg?: number;
};

/** Réduit un display_name Nominatim pour l'UI (évite les chaînes interminables). */
export function shortenDisplayName(displayName: string, maxLen = 64): string {
  const parts = displayName.split(',').map((p) => p.trim());
  const short = parts.slice(0, 2).join(', ');
  if (short.length <= maxLen) return short;
  return `${displayName.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

function viewboxForBias(lat: number, lon: number, deltaDeg = 0.5): string {
  const minLon = lon - deltaDeg;
  const maxLon = lon + deltaDeg;
  const minLat = lat - deltaDeg;
  const maxLat = lat + deltaDeg;
  return `${minLon},${maxLat},${maxLon},${minLat}`;
}

async function nominatimSearch(
  q: string,
  viewbox: string | null,
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    q,
  });
  if (viewbox) {
    params.set('viewbox', viewbox);
    params.set('bounded', '1');
  }
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Questia/1.0 (daily quest; +https://github.com/souProjet/Questia)',
      'Accept-Language': 'fr',
    },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat ?? '');
  const lon = parseFloat(data[0].lon ?? '');
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  const displayName =
    typeof data[0].display_name === 'string' && data[0].display_name.trim()
      ? data[0].display_name.trim()
      : null;
  return { lat, lon, displayName };
}

/**
 * Géocodage via Nominatim (OSM). Usage raisonné côté serveur uniquement.
 * Si `nearLat` / `nearLon` sont fournis, la recherche est d'abord restreinte à une zone autour de l'utilisateur.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */
export async function geocodeNominatim(
  query: string,
  options?: GeocodeOptions,
): Promise<GeocodeResult | null> {
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

  const nearLat = options?.nearLat;
  const nearLon = options?.nearLon;
  const hasBias =
    typeof nearLat === 'number' &&
    typeof nearLon === 'number' &&
    Number.isFinite(nearLat) &&
    Number.isFinite(nearLon);

  try {
    let result: GeocodeResult | null = null;
    if (hasBias) {
      const delta = options?.viewboxDeltaDeg ?? 0.5;
      const vb = viewboxForBias(nearLat, nearLon, delta);
      result = await nominatimSearch(q, vb);
    }
    if (!result) {
      result = await nominatimSearch(q, null);
    }

    const durationMs = Math.round(performance.now() - t0);
    if (!result) {
      logStructured({
        domain: 'geo',
        operation: 'nominatim.search',
        level: 'info',
        outcome: 'miss',
        durationMs,
        meta: { queryCharCount, emptyResults: true, hadBias: hasBias },
      });
      return null;
    }

    logStructured({
      domain: 'geo',
      operation: 'nominatim.search',
      level: 'info',
      outcome: 'ok',
      durationMs,
      meta: { queryCharCount, hadBias: hasBias },
    });
    return result;
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
