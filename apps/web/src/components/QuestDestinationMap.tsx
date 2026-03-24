'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type QuestDestinationPayload = {
  label: string;
  lat: number | null;
  lon: number | null;
};

function useFixLeafletIcons() {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);
}

function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length < 1) return;
    if (positions.length === 1) {
      map.setView(positions[0], 15);
      return;
    }
    const bounds = L.latLngBounds(positions.map((p) => [p[0], p[1]]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  }, [map, positions]);
  return null;
}

async function fetchFootRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  signal: AbortSignal,
): Promise<[number, number][] | null> {
  const url = `https://router.project-osrm.org/route/v1/foot/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    routes?: { geometry?: { coordinates?: [number, number][] } }[];
  };
  const coords = data.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  return coords.map(([lon, lat]) => [lat, lon] as [number, number]);
}

export default function QuestDestinationMap({
  destination,
  userPosition,
}: {
  destination: QuestDestinationPayload;
  userPosition: { lat: number; lon: number } | null;
}) {
  useFixLeafletIcons();
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeError, setRouteError] = useState(false);

  const dest = destination.lat != null && destination.lon != null
    ? { lat: destination.lat, lon: destination.lon }
    : null;

  useEffect(() => {
    if (!dest || !userPosition) {
      setRoute(null);
      setRouteError(false);
      return;
    }
    const ac = new AbortController();
    setRouteError(false);
    fetchFootRoute(userPosition, dest, ac.signal)
      .then((pts) => {
        if (!ac.signal.aborted) setRoute(pts);
      })
      .catch(() => {
        if (!ac.signal.aborted) setRouteError(true);
      });
    return () => ac.abort();
  }, [dest?.lat, dest?.lon, userPosition?.lat, userPosition?.lon]);

  const googleSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination.label)}`;
  const googleDir =
    dest && userPosition
      ? `https://www.google.com/maps/dir/?api=1&origin=${userPosition.lat},${userPosition.lon}&destination=${dest.lat},${dest.lon}&travelmode=walking`
      : null;
  const osmDir =
    dest && userPosition
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${userPosition.lat}%2C${userPosition.lon}%3B${dest.lat}%2C${dest.lon}`
      : null;

  const center = useMemo((): [number, number] => {
    if (dest) return [dest.lat, dest.lon];
    return [48.8566, 2.3522];
  }, [dest]);

  const positionsForFit = useMemo((): [number, number][] => {
    if (route && route.length > 1) return route;
    if (!dest) return [[48.8566, 2.3522]];
    const pts: [number, number][] = [[dest.lat, dest.lon]];
    if (userPosition) pts.push([userPosition.lat, userPosition.lon]);
    return pts;
  }, [route, dest, userPosition]);

  if (!dest) {
    return (
      <div className="rounded-2xl border border-cyan-200/70 bg-white/90 p-4 shadow-sm">
        <p className="text-sm font-bold text-cyan-950">📍 {destination.label}</p>
        <p className="mt-1 text-xs text-[var(--on-cream-muted)]">
          Le lieu n’a pas pu être placé sur une carte automatiquement. Ouvre la recherche ci-dessous.
        </p>
        <a
          href={googleSearch}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2.5 text-sm font-black text-white shadow-md"
        >
          Ouvrir dans Maps
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-cyan-200/70 shadow-md ring-1 ring-cyan-100/80">
        <div className="h-[min(58vw,300px)] w-full min-h-[220px] sm:h-[280px]">
          <MapContainer
            center={center}
            zoom={14}
            className="h-full w-full z-0"
            scrollWheelZoom
            attributionControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {route && route.length > 1 ? (
              <Polyline
                positions={route}
                pathOptions={{ color: '#0891b2', weight: 5, opacity: 0.88 }}
              />
            ) : null}
            <Marker position={[dest.lat, dest.lon]}>
              <Popup>
                <span className="font-semibold">Lieu de la quête</span>
                <br />
                {destination.label}
              </Popup>
            </Marker>
            {userPosition ? (
              <Marker position={[userPosition.lat, userPosition.lon]}>
                <Popup>Toi (approx.)</Popup>
              </Marker>
            ) : null}
            <FitRoute positions={positionsForFit} />
          </MapContainer>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {googleDir ? (
          <a
            href={googleDir}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2.5 text-center text-sm font-black text-white shadow-md"
          >
            Itinéraire à pied (Google Maps)
          </a>
        ) : (
          <p className="text-xs text-[var(--on-cream-muted)]">
            Active la localisation dans le navigateur pour tracer un itinéraire depuis ta position.
          </p>
        )}
        {osmDir ? (
          <a
            href={osmDir}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl border-2 border-cyan-300/60 bg-white px-4 py-2.5 text-center text-sm font-bold text-cyan-950"
          >
            Itinéraire (OpenStreetMap)
          </a>
        ) : null}
        <a
          href={googleSearch}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs font-bold text-slate-700"
        >
          Rechercher « {destination.label} »
        </a>
      </div>

      {routeError ? (
        <p className="text-xs text-amber-800">
          L’itinéraire à pied n’a pas pu être calculé (serveur occupé). Utilise le bouton Google Maps.
        </p>
      ) : null}
    </div>
  );
}
