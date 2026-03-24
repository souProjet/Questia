/**
 * Géocodage via Nominatim (OSM). Usage raisonné côté serveur uniquement.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */
export async function geocodeNominatim(query: string): Promise<{ lat: number; lon: number } | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Questia/1.0 (daily quest; +https://github.com/souProjet/Questia)',
      'Accept-Language': 'fr',
    },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string }[];
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat ?? '');
  const lon = parseFloat(data[0].lon ?? '');
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon };
}
