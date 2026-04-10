import type { MetadataRoute } from 'next';
import { siteUrl } from '@/config/marketing';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  /** Pas de pages noindex (auth, onboarding) : évite d'envoyer des URL que le sitemap ne doit pas faire indexer. */
  const paths = [
    { path: '', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/legal/confidentialite', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/mentions-legales', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/cgu', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/cgv', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/bien-etre', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/generation-quetes', priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority, changeFrequency } of paths) {
    entries.push({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    });
    if (path !== '') {
      entries.push({
        url: `${siteUrl}/en${path}`,
        lastModified: now,
        changeFrequency,
        priority,
      });
    } else {
      entries.push({
        url: `${siteUrl}/en`,
        lastModified: now,
        changeFrequency,
        priority,
      });
    }
  }

  return entries;
}
