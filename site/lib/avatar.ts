import { supabase } from './supabase';

const AVATAR_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';

export async function getDisplayAvatarUrl(avatarUrlOrPath?: string | null): Promise<string | null> {
  if (!avatarUrlOrPath) return null;
  if (/^https?:\/\//i.test(avatarUrlOrPath)) return avatarUrlOrPath;
  try {
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(avatarUrlOrPath, 3600);
    if (error) throw error;
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}


