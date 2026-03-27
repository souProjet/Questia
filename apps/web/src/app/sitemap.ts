import type { MetadataRoute } from 'next';
import { siteUrl } from '@/config/marketing';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const paths = [
    { path: '', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/onboarding', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/sign-in', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/sign-up', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/legal/confidentialite', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/mentions-legales', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/cgu', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/cgv', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/bien-etre', priority: 0.3, changeFrequency: 'yearly' as const },
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
