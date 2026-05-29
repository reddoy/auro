import type { SupabaseClient } from '@supabase/supabase-js';
import { profileDisplayName } from '@/lib/profile-display-name';

export async function getRequestNotificationContext(
  admin: SupabaseClient,
  requestId: string
): Promise<{
  requestId: string;
  reviewerId: string | null;
  revieweeId: string | null;
  reviewerName: string;
  revieweeName: string;
  amountLabel: string | null;
} | null> {
  const { data: request, error } = await admin
    .from('requests')
    .select('id, influencer_id, user_id, amount_cents')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !request) return null;

  const reviewerId = (request as { influencer_id?: string }).influencer_id ?? null;
  const revieweeId = (request as { user_id?: string }).user_id ?? null;
  const amountCents = (request as { amount_cents?: number }).amount_cents;

  const ids = [reviewerId, revieweeId].filter(Boolean) as string[];
  let reviewerName = 'Your reviewer';
  let revieweeName = 'A customer';

  if (ids.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, first_name, last_name, username, email')
      .in('id', ids);

    for (const p of profiles || []) {
      const name =
        profileDisplayName(p as { first_name?: string; last_name?: string; username?: string; email?: string }) ||
        'User';
      if (p.id === reviewerId) reviewerName = name;
      if (p.id === revieweeId) revieweeName = name;
    }
  }

  const amountLabel =
    typeof amountCents === 'number' && amountCents > 0
      ? `$${(amountCents / 100).toFixed(2)}`
      : null;

  return {
    requestId,
    reviewerId,
    revieweeId,
    reviewerName,
    revieweeName,
    amountLabel,
  };
}
