import { useMemo } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Aligné sur le web `https://…/app/shop` (Stripe success_url / App Links).
 * Redirige vers l’onglet boutique en conservant les paramètres de requête.
 */
export default function AppShopDeepLinkScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const href = useMemo(() => {
    const q = new URLSearchParams();
    for (const key of Object.keys(params).sort()) {
      const v = params[key];
      if (v === undefined) continue;
      const vals = Array.isArray(v) ? v : [v];
      for (const item of vals) q.append(key, String(item));
    }
    const tail = q.toString();
    return (tail ? `/shop?${tail}` : '/shop') as '/shop' | `/shop?${string}`;
  }, [params]);
  return <Redirect href={href} />;
}
