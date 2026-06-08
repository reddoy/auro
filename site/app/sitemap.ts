import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';
import { getPublicReviewerProfiles } from '@/lib/sitemap-profiles';

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/reviewers/apply', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/reviewers', changeFrequency: 'daily', priority: 0.9 },
  { path: '/request', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/support', changeFrequency: 'monthly', priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const profiles = await getPublicReviewerProfiles();
  const profileEntries: MetadataRoute.Sitemap = profiles.map((profile) => ({
    url: `${baseUrl}/${encodeURIComponent(profile.username)}`,
    lastModified: profile.updatedAt ? new Date(profile.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticEntries, ...profileEntries];
}
