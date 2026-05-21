import type { SupabaseClient } from '@supabase/supabase-js';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Notify an approved reviewer that a paid review request is ready to accept or decline.
 */
export async function notifyReviewerOfPaidRequest(
  admin: SupabaseClient,
  requestId: string
): Promise<void> {
  try {
    const { data: requestData } = await admin
      .from('requests')
      .select('influencer_id, user_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (!requestData || (requestData as { status?: string }).status !== 'paid') {
      return;
    }

    const reviewerId = (requestData as { influencer_id?: string }).influencer_id;
    const revieweeId = (requestData as { user_id?: string }).user_id;

    if (!reviewerId || !revieweeId || reviewerId === revieweeId) {
      return;
    }

    const { data: reviewerProfile } = await admin
      .from('profiles')
      .select('push_token, is_reviewer, id')
      .eq('id', reviewerId)
      .maybeSingle();

    if (
      !reviewerProfile?.push_token ||
      reviewerProfile.id !== reviewerId ||
      reviewerProfile.is_reviewer !== 'approved'
    ) {
      return;
    }

    await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: reviewerProfile.push_token,
        sound: 'default',
        title: 'New paid review request',
        body: 'Payment received — accept to start or decline for a refund.',
        data: {
          type: 'new_request',
          requestId,
        },
        priority: 'high',
      }),
    }).catch((err) => console.error('[notifyReviewerOfPaidRequest] push failed', err));
  } catch (e) {
    console.error('[notifyReviewerOfPaidRequest] error', e);
  }
}
