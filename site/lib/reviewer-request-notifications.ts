import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyUser } from '@/lib/notifications/notify-user';
import { getRequestNotificationContext } from '@/lib/notifications/request-context';

/**
 * Notify reviewer (new paid request) and reviewee (payment receipt) after checkout payment.
 */
export async function notifyReviewerOfPaidRequest(
  admin: SupabaseClient,
  requestId: string
): Promise<void> {
  try {
    const ctx = await getRequestNotificationContext(admin, requestId);
    if (!ctx?.reviewerId || !ctx.revieweeId || ctx.reviewerId === ctx.revieweeId) {
      return;
    }

    const { data: reviewerProfile } = await admin
      .from('profiles')
      .select('is_reviewer')
      .eq('id', ctx.reviewerId)
      .maybeSingle();

    if ((reviewerProfile as { is_reviewer?: string } | null)?.is_reviewer !== 'approved') {
      return;
    }

    const data = {
      requestId,
      reviewerName: ctx.reviewerName,
      revieweeName: ctx.revieweeName,
      amount: ctx.amountLabel ?? undefined,
    };

    await notifyUser(admin, {
      userId: ctx.reviewerId,
      type: 'request_paid_reviewer',
      entityId: requestId,
      data,
    });

    await notifyUser(admin, {
      userId: ctx.revieweeId,
      type: 'payment_receipt_reviewee',
      entityId: `${requestId}:receipt`,
      data,
    });
  } catch (e) {
    console.error('[notifyReviewerOfPaidRequest] error', e);
  }
}
