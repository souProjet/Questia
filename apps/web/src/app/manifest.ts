import type { MetadataRoute } from 'next';
import { pwaManifestDescriptionFr, siteUrl } from '@/config/marketing';

/** PWA / ajout écran d'accueil — renforce la présence marque dans les résultats enrichis. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Questia',
    short_name: 'Questia',
    description: pwaManifestDescriptionFr(),
    id: `${siteUrl}/`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fffbeb',
    theme_color: '#0ea5e9',
    categories: ['lifestyle', 'entertainment'],
    icons: [
      {
        src: '/brand/questia-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
