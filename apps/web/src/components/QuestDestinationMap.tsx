'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

export type QuestDestinationPayload = {
  label: string;
  lat: number | null;
  lon: number | null;
};

const QuestDestinationMapLeaflet = dynamic(
  () => import('./QuestDestinationMapLeaflet'),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-b from-cyan-50/80 to-white text-xs font-medium text-[var(--muted)]"
        aria-hidden
      >
        Chargement de la carte…
      </div>
    ),
  },
);

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
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeError, setRouteError] = useState(false);

  const dest = useMemo(() => {
    if (destination.lat != null && destination.lon != null) {
      return { lat: destination.lat, lon: destination.lon };
    }
    return null;
  }, [destination.lat, destination.lon]);

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
  }, [dest, userPosition]);

  const googleMapsHref = useMemo(() => {
    if (dest && userPosition) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userPosition.lat},${userPosition.lon}&destination=${dest.lat},${dest.lon}&travelmode=walking`;
    }
    if (dest) {
      return `https://www.google.com/maps/search/?api=1&query=${dest.lat},${dest.lon}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination.label)}`;
  }, [dest, userPosition, destination.label]);

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

  const mapInstanceKey = dest ? `${dest.lat}-${dest.lon}` : 'map';

  const labelTrim = destination.label.trim();
  const mapPopupLabel =
    !labelTrim ||
    /^null$/i.test(labelTrim) ||
    /^undefined$/i.test(labelTrim) ||
    /^lieu de la quête$/i.test(labelTrim)
      ? 'Point de rendez-vous'
      : destination.label;

  if (!dest) {
    return (
      <div className="rounded-2xl border border-cyan-200/50 bg-gradient-to-br from-white via-cyan-50/30 to-white p-4 shadow-sm ring-1 ring-cyan-100/70">
        <p className="text-sm font-semibold text-cyan-950">
          📍{' '}
          {!destination.label.trim() || /^null$/i.test(destination.label.trim())
            ? 'Lieu à préciser'
            : destination.label}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--on-cream-muted)]">
          Le lieu n’a pas pu être placé sur la carte. Ouvre Google Maps pour t’orienter.
        </p>
        <a
          href={googleMapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-md mt-4 w-full font-semibold"
        >
          Ouvrir dans Google Maps
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-cyan-200/45 bg-white/40 shadow-[0_8px_30px_-12px_rgba(34,211,238,0.25)] ring-1 ring-cyan-100/80">
        <div className="h-[min(58vw,300px)] w-full min-h-[220px] sm:h-[280px]">
          <QuestDestinationMapLeaflet
            key={mapInstanceKey}
            mapKey={mapInstanceKey}
            center={center}
            dest={dest}
            destinationLabel={mapPopupLabel}
            route={route}
            userPosition={userPosition}
            positionsForFit={positionsForFit}
          />
        </div>
      </div>

      <a
        href={googleMapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary btn-md w-full font-semibold"
      >
        {userPosition ? 'Itinéraire dans Google Maps' : 'Voir dans Google Maps'}
      </a>

      {routeError ? (
        <p className="text-center text-xs text-amber-800/90">
          L’itinéraire à pied n’a pas pu être calculé. Utilise le lien ci-dessus.
        </p>
      ) : null}
    </div>
  );
}
