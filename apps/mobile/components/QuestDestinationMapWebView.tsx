import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

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

function mapPopupLabelFromDestination(label: string): string {
  const labelTrim = label.trim();
  if (
    !labelTrim ||
    /^null$/i.test(labelTrim) ||
    /^undefined$/i.test(labelTrim) ||
    /^lieu de la quête$/i.test(labelTrim)
  ) {
    return 'Point de rendez-vous';
  }
  return label;
}

function buildLeafletHtml(payload: {
  destLat: number;
  destLon: number;
  destinationLabel: string;
  route: [number, number][];
  userLat: number | null;
  userLon: number | null;
  userPopup: string;
  rendezvousWord: string;
}): string {
  const json = JSON.stringify(payload);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>html,body,#map{margin:0;padding:0;height:100%;width:100%;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var P = ${json};
      var TILE_URL = ${JSON.stringify(TILE_URL)};
      var ATTRIB = ${JSON.stringify(TILE_ATTRIBUTION)};
      var center = [P.destLat, P.destLon];
      var map = L.map('map', { zoomControl: true, attributionControl: true }).setView(center, 14);
      L.tileLayer(TILE_URL, {
        attribution: ATTRIB,
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);
      var esc = (function (s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      });
      var popupHtml =
        '<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.45;max-width:240px;padding:2px 0">' +
        '<strong style="color:#0e7490">' +
        esc(P.rendezvousWord) +
        '</strong><br/><span style="color:#475569">' +
        esc(P.destinationLabel) +
        '</span></div>';
      L.circleMarker([P.destLat, P.destLon], {
        radius: 9,
        color: '#0e7490',
        weight: 3,
        fillColor: '#ccfbf1',
        fillOpacity: 0.95,
      })
        .addTo(map)
        .bindPopup(popupHtml);
      if (P.route && P.route.length > 1) {
        L.polyline(P.route, {
          color: '#0891b2',
          weight: 4,
          opacity: 0.88,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }
      if (P.userLat != null && P.userLon != null) {
        L.circleMarker([P.userLat, P.userLon], {
          radius: 7,
          color: '#0284c7',
          weight: 2,
          fillColor: '#e0f2fe',
          fillOpacity: 0.95,
        })
          .addTo(map)
          .bindPopup(
            '<div style="font-family:system-ui,sans-serif;font-size:12px;color:#0c4a6e">' +
              esc(P.userPopup) +
            '</div>',
          );
      }
      var pts = [];
      if (P.route && P.route.length > 1) {
        pts = P.route;
      } else {
        pts.push([P.destLat, P.destLon]);
        if (P.userLat != null && P.userLon != null) pts.push([P.userLat, P.userLon]);
      }
      if (pts.length > 1) {
        var b = L.latLngBounds(pts);
        map.fitBounds(b, { padding: [28, 28], maxZoom: 15 });
      } else {
        map.setView([P.destLat, P.destLon], 15);
      }
    })();
  </script>
</body>
</html>`;
}

export type QuestDestinationMapLabels = {
  openInMaps: string;
  openDirections: string;
  routeFailed: string;
  noGeocodeTitle: string;
  noGeocodeBody: string;
  rendezvous: string;
  userHere: string;
};

type Props = {
  destination: { label: string; lat: number | null; lon: number | null };
  userPosition: { lat: number; lon: number } | null;
  labels: QuestDestinationMapLabels;
  /** Couleurs discrètes pour le cadre (thème Questia). */
  borderColor: string;
  cardBg: string;
  mutedColor: string;
  linkColor: string;
};

export function QuestDestinationMapWebView({
  destination,
  userPosition,
  labels,
  borderColor,
  cardBg,
  mutedColor,
  linkColor,
}: Props) {
  const { height: winH } = useWindowDimensions();
  const mapHeight = Math.min(Math.round(winH * 0.34), 200);

  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeError, setRouteError] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

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

  const popupLabel = mapPopupLabelFromDestination(destination.label);

  const html = useMemo(() => {
    if (!dest) return null;
    return buildLeafletHtml({
      destLat: dest.lat,
      destLon: dest.lon,
      destinationLabel: popupLabel,
      route: route ?? [],
      userLat: userPosition?.lat ?? null,
      userLon: userPosition?.lon ?? null,
      userPopup: labels.userHere,
      rendezvousWord: labels.rendezvous,
    });
  }, [dest, popupLabel, route, userPosition, labels.userHere, labels.rendezvous]);

  const webKey = useMemo(() => {
    if (!dest) return 'none';
    return `${dest.lat},${dest.lon}-${route?.length ?? 0}-${userPosition?.lat ?? 'n'}`;
  }, [dest, route, userPosition]);

  useEffect(() => {
    setMapLoading(true);
  }, [webKey]);

  if (!dest) {
    return (
      <View style={[styles.fallback, { borderColor, backgroundColor: cardBg }]}>
        <Text style={[styles.fallbackTitle, { color: linkColor }]}>
          {labels.noGeocodeTitle}
        </Text>
        <Text style={[styles.fallbackBody, { color: mutedColor }]}>{labels.noGeocodeBody}</Text>
        <Pressable
          style={[styles.cta, { borderColor: `${linkColor}55` }]}
          onPress={() => void Linking.openURL(googleMapsHref)}
        >
          <Text style={[styles.ctaText, { color: linkColor }]}>{labels.openInMaps}</Text>
        </Pressable>
      </View>
    );
  }

  const ctaLabel = userPosition ? labels.openDirections : labels.openInMaps;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.mapFrame,
          {
            height: mapHeight,
            borderColor,
            backgroundColor: cardBg,
          },
        ]}
      >
        {mapLoading ? (
          <View style={[styles.loader, { height: mapHeight }]}>
            <ActivityIndicator color={linkColor} />
          </View>
        ) : null}
        {html ? (
          <WebView
            key={webKey}
            source={{ html, baseUrl: 'https://questia.fr' }}
            style={[styles.webview, { height: mapHeight }]}
            scrollEnabled={false}
            nestedScrollEnabled
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            mixedContentMode="compatibility"
            onLoadStart={() => setMapLoading(true)}
            onLoadEnd={() => setMapLoading(false)}
            setBuiltInZoomControls={false}
            allowsFullscreenVideo={false}
          />
        ) : null}
      </View>
      <Pressable
        style={[styles.cta, { borderColor: `${linkColor}55`, marginTop: 10 }]}
        onPress={() => void Linking.openURL(googleMapsHref)}
      >
        <Text style={[styles.ctaText, { color: linkColor }]}>{ctaLabel}</Text>
      </Pressable>
      {routeError ? (
        <Text style={[styles.routeErr, { color: mutedColor }]}>{labels.routeFailed}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  mapFrame: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  webview: { flex: 0, backgroundColor: 'transparent', opacity: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  fallback: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  fallbackTitle: { fontSize: 15, fontWeight: '800' },
  fallbackBody: { marginTop: 8, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  cta: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  ctaText: { fontSize: 14, fontWeight: '800' },
  routeErr: { marginTop: 8, fontSize: 12, textAlign: 'center', fontWeight: '600' },
});
