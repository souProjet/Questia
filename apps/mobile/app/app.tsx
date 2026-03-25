import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Route native alignée sur le web `/app` (Universal Links / App Links).
 * Ex. https://questia.fr/app?questDate=2026-03-25 → accueil avec la quête du jour concernée.
 */
export default function AppDeepLinkScreen() {
  const params = useLocalSearchParams<{ questDate?: string | string[]; date?: string | string[] }>();
  const qRaw = params.questDate ?? params.date;
  const qd = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  if (typeof qd === 'string' && qd.length >= 8) {
    return <Redirect href={`/home?questDate=${encodeURIComponent(qd)}`} />;
  }
  return <Redirect href="/home" />;
}
