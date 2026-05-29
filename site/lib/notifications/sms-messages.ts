import { appRequestUrl, getSiteOrigin } from '@/lib/notifications/site-url';
import type { ProductNotificationType } from '@/lib/notifications/types';

export function buildProductSmsMessage(
  type: ProductNotificationType,
  data: Record<string, string | number | undefined> = {}
): string | null {
  const requestId = typeof data.requestId === 'string' ? data.requestId : '';
  const reviewerName = typeof data.reviewerName === 'string' ? data.reviewerName : 'Your reviewer';
  const hoursLeft = typeof data.hoursLeft === 'string' ? data.hoursLeft : '';
  const rating = typeof data.rating === 'number' ? data.rating : typeof data.rating === 'string' ? data.rating : '';
  const decision = typeof data.decision === 'string' ? data.decision : '';

  switch (type) {
    case 'request_paid_reviewer':
      return requestId
        ? `Auro: New paid review request. Accept or decline within 14 days: ${appRequestUrl(requestId, 'reviewer')}`
        : `Auro: New paid review request. Open ${getSiteOrigin()}/app/requests`;
    case 'payment_receipt_reviewee':
      return `Auro: Payment received. ${reviewerName} has 14 days to accept. ${getSiteOrigin()}/app/requests`;
    case 'request_accepted_reviewee':
      return `${reviewerName} accepted your Auro review — expect it within 48h. ${requestId ? appRequestUrl(requestId, 'reviewee') : getSiteOrigin()}`;
    case 'review_completed_reviewee':
      return `Auro: Your video review is ready. Watch now: ${requestId ? appRequestUrl(requestId, 'reviewee') : getSiteOrigin()}`;
    case 'request_declined_reviewee':
      return `Auro: ${reviewerName} declined your request. Refund processing — check email for details.`;
    case 'payout_sent_reviewer':
      return `Auro: Payout sent to your connected account. ${getSiteOrigin()}/app`;
    case 'deadline_warning_reviewer':
      return `Auro: ${hoursLeft || 'Deadline soon'} left to complete a review. ${requestId ? appRequestUrl(requestId, 'reviewer') : getSiteOrigin()}`;
    case 'timeout_refund_reviewee':
      return `Auro: Your review request expired. Refund processing. ${getSiteOrigin()}/app/requests`;
    case 'timeout_refund_reviewer':
      return `Auro: A review request timed out and was refunded.`;
    case 'reviewer_application_decision':
      return decision === 'approved'
        ? `Auro: You're approved as a reviewer. Start at ${getSiteOrigin()}/app`
        : `Auro: Update on your reviewer application. Check your email for details.`;
    case 'reviewer_rating_received':
      return `Auro: New ${rating}-star rating from a customer.`;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
