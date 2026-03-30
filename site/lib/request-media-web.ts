import { supabase } from '@/lib/supabase';

const BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET || 'request-media';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Browser upload for reviewer-submitted review video (replaces native uploadRequestMedia). */
export async function uploadRequestMediaWeb(
  file: File,
  opts: { onProgress?: (n: number) => void } = {}
): Promise<{ publicUrl: string; path: string }> {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error('Sign in required');

  const ext =
    (file.name.includes('.') && file.name.split('.').pop()?.toLowerCase()) ||
    'mp4';
  const path = `${user.id}/requests/web_${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    opts.onProgress?.(30);
  } catch {}

  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type || 'video/mp4',
      upsert: true,
    });
  if (uploadError) throw uploadError;
  try {
    opts.onProgress?.(90);
  } catch {}

  const { data: signed } = await client.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  try {
    opts.onProgress?.(100);
  } catch {}

  return { publicUrl: signed?.signedUrl || '', path };
}
