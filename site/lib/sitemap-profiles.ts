import { createClient } from '@supabase/supabase-js';

export type SitemapProfile = {
  username: string;
  updatedAt?: string;
};

/** Approved reviewer usernames for public profile URLs (`/{username}`). */
export async function getPublicReviewerProfiles(): Promise<SitemapProfile[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return [];

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .eq('is_reviewer', 'approved')
    .not('username', 'is', null);

  if (error) {
    console.error('[sitemap] failed to load reviewer profiles:', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => ({
      username: (row.username as string | null)?.trim() ?? '',
      updatedAt: (row.updated_at as string | null) ?? undefined,
    }))
    .filter((row) => row.username.length > 0);
}
