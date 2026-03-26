'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Fond clair type « parchemin numérique » — cohérent avec le fond app (cyan / crème). */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function escapePopupHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type QuestDestinationMapLeafletProps = {
  /** Clé stable par destination — recrée la carte si le lieu change. */
  mapKey: string;
  center: [number, number];
  dest: { lat: number; lon: number };
  destinationLabel: string;
  route: [number, number][] | null;
  userPosition: { lat: number; lon: number } | null;
  positionsForFit: [number, number][];
};

/**
 * Leaflet en impératif (pas de MapContainer react-leaflet) pour éviter
 * « Map container is already initialized » avec React 19 / Strict Mode.
 */
export default function QuestDestinationMapLeaflet({
  mapKey,
  center,
  dest,
  destinationLabel,
  route,
  userPosition,
  positionsForFit,
}: QuestDestinationMapLeafletProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, {
      scrollWheelZoom: true,
      attributionControl: true,
    }).setView(center, 14);

    mapRef.current = map;

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    const popupHtml = `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.45;max-width:240px;padding:2px 0"><strong style="color:#0e7490">Rendez-vous</strong><br/><span style="color:#475569">${escapePopupHtml(destinationLabel)}</span></div>`;

    L.circleMarker([dest.lat, dest.lon], {
      radius: 9,
      color: '#0e7490',
      weight: 3,
      fillColor: '#ccfbf1',
      fillOpacity: 0.95,
    })
      .addTo(map)
      .bindPopup(popupHtml);

    return () => {
      routeLineRef.current = null;
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [mapKey, center, dest.lat, dest.lon, destinationLabel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (route && route.length > 1) {
      routeLineRef.current = L.polyline(route, {
        color: '#0891b2',
        weight: 4,
        opacity: 0.88,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    if (positionsForFit.length < 1) return;
    if (positionsForFit.length === 1) {
      map.setView(positionsForFit[0], 15);
      return;
    }
    const bounds = L.latLngBounds(positionsForFit.map((p) => [p[0], p[1]]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [mapKey, route, positionsForFit]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userPosition) {
      userMarkerRef.current = L.circleMarker([userPosition.lat, userPosition.lon], {
        radius: 7,
        color: '#0284c7',
        weight: 2,
        fillColor: '#e0f2fe',
        fillOpacity: 0.95,
      })
        .addTo(map)
        .bindPopup(
          '<div style="font-family:system-ui,sans-serif;font-size:12px;color:#0c4a6e">Ta position (approx.)</div>',
        );
    }
  }, [mapKey, userPosition]);

  return (
    <div
      ref={containerRef}
      className="quest-map-leaflet relative z-0 h-full w-full min-h-0 rounded-[inherit]"
    />
  );
}
