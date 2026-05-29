import type { SupabaseClient } from '@supabase/supabase-js';
import { wasNotificationSent, logNotificationDelivery } from '@/lib/notifications/delivery-log';
import { recipientFromProfileRow } from '@/lib/notifications/preferences';
import { sendProductEmail } from '@/lib/notifications/send-product-email';
import { sendProductSms } from '@/lib/notifications/send-product-sms';
import type { NotifyUserPayload } from '@/lib/notifications/types';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPush(params: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: params.token,
        sound: 'default',
        title: params.title,
        body: params.body,
        data: params.data || {},
        priority: 'high',
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { ok: false, error: JSON.stringify(result) };
    }
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'push failed' };
  }
}

function pushCopyForType(type: NotifyUserPayload['type']): { title: string; body: string } | null {
  switch (type) {
    case 'request_paid_reviewer':
      return { title: 'New paid review request', body: 'Payment received — accept to start or decline for a refund.' };
    case 'review_completed_reviewee':
      return { title: 'Your review is ready', body: 'Your reviewer just submitted your video review. Tap to watch it.' };
    case 'request_declined_reviewee':
      return {
        title: 'Request declined',
        body: 'Your reviewer declined this request. Your refund is processing.',
      };
    case 'request_accepted_reviewee':
      return { title: 'Review in progress', body: 'Your reviewer accepted and is working on your review.' };
    case 'deadline_warning_reviewer':
      return { title: 'Review deadline approaching', body: 'Complete your review before the deadline to avoid a refund.' };
    default:
      return null;
  }
}

/**
 * Send product notifications via email and SMS (web-first). Push is sent only when a token exists.
 */
export async function notifyUser(
  admin: SupabaseClient,
  payload: NotifyUserPayload
): Promise<{ email: boolean; sms: boolean; push: boolean }> {
  const { userId, type, entityId, data, force } = payload;

  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, email, first_name, preferences, push_token')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    console.error('[notifyUser] profile fetch failed', userId, error?.message);
    return { email: false, sms: false, push: false };
  }

  const recipient = recipientFromProfileRow(profile as Parameters<typeof recipientFromProfileRow>[0]);
  const result = { email: false, sms: false, push: false };

  if (recipient.emailNotifications && recipient.email) {
    const already = !force && entityId
      ? await wasNotificationSent(admin, { userId, type, entityId, channel: 'email' })
      : false;
    if (!already) {
      const emailResult = await sendProductEmail({
        to: recipient.email,
        type,
        data,
      });
      if (emailResult.ok) {
        result.email = true;
        await logNotificationDelivery(admin, {
          userId,
          type,
          entityId,
          channel: 'email',
          status: 'sent',
          providerId: emailResult.id,
        });
      } else if (!emailResult.skipped) {
        await logNotificationDelivery(admin, {
          userId,
          type,
          entityId,
          channel: 'email',
          status: 'failed',
          errorMessage: emailResult.error,
        });
        console.error('[notifyUser] email failed', type, userId, emailResult.error);
      }
    }
  }

  if (recipient.smsNotifications && recipient.phone) {
    const already = !force && entityId
      ? await wasNotificationSent(admin, { userId, type, entityId, channel: 'sms' })
      : false;
    if (!already) {
      const smsResult = await sendProductSms({
        to: recipient.phone,
        type,
        data,
      });
      if (smsResult.ok) {
        result.sms = true;
        await logNotificationDelivery(admin, {
          userId,
          type,
          entityId,
          channel: 'sms',
          status: 'sent',
          providerId: smsResult.sid,
        });
      } else if (!smsResult.skipped) {
        await logNotificationDelivery(admin, {
          userId,
          type,
          entityId,
          channel: 'sms',
          status: 'failed',
          errorMessage: smsResult.error,
        });
        console.error('[notifyUser] sms failed', type, userId, smsResult.error);
      }
    }
  }

  const pushCopy = pushCopyForType(type);
  if (recipient.pushToken && pushCopy) {
    const already = !force && entityId
      ? await wasNotificationSent(admin, { userId, type, entityId, channel: 'push' })
      : false;
    if (!already) {
      const pushResult = await sendExpoPush({
        token: recipient.pushToken,
        title: pushCopy.title,
        body: pushCopy.body,
        data: {
          type,
          ...(entityId ? { requestId: entityId } : {}),
        },
      });
      if (pushResult.ok) {
        result.push = true;
        await logNotificationDelivery(admin, {
          userId,
          type,
          entityId,
          channel: 'push',
          status: 'sent',
        });
      } else {
        await logNotificationDelivery(admin, {
          userId,
          type,
          entityId,
          channel: 'push',
          status: 'failed',
          errorMessage: pushResult.error,
        });
      }
    }
  }

  return result;
}

/** Notify reviewer + reviewee for a request-scoped event. */
export async function notifyRequestParties(
  admin: SupabaseClient,
  params: {
    requestId: string;
    reviewerId: string;
    revieweeId: string;
    reviewerType?: NotifyUserPayload['type'];
    revieweeType?: NotifyUserPayload['type'];
    data?: Record<string, string | number | undefined>;
  }
): Promise<void> {
  const data = { requestId: params.requestId, ...params.data };

  if (params.reviewerType && params.reviewerId) {
    await notifyUser(admin, {
      userId: params.reviewerId,
      type: params.reviewerType,
      entityId: params.requestId,
      data,
    });
  }
  if (params.revieweeType && params.revieweeId) {
    await notifyUser(admin, {
      userId: params.revieweeId,
      type: params.revieweeType,
      entityId: params.requestId,
      data,
    });
  }
}
