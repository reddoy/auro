import { appRequestUrl, getSiteOrigin } from '@/lib/notifications/site-url';
import { wrapProductEmailHtml } from '@/lib/notifications/email-layout';
import type { ProductNotificationType } from '@/lib/notifications/types';

export type EmailMessage = {
  subject: string;
  html: string;
  text: string;
};

export function buildProductEmailMessage(
  type: ProductNotificationType,
  data: Record<string, string | number | undefined> = {}
): EmailMessage {
  const requestId = typeof data.requestId === 'string' ? data.requestId : '';
  const reviewerName = typeof data.reviewerName === 'string' ? data.reviewerName : 'Your reviewer';
  const revieweeName = typeof data.revieweeName === 'string' ? data.revieweeName : 'A customer';
  const amount = typeof data.amount === 'string' ? data.amount : '';
  const hoursLeft = typeof data.hoursLeft === 'string' ? data.hoursLeft : '';
  const rating = typeof data.rating === 'number' ? data.rating : typeof data.rating === 'string' ? data.rating : '';
  const decision = typeof data.decision === 'string' ? data.decision : '';
  const commentSnippet = typeof data.commentSnippet === 'string' ? data.commentSnippet : '';

  switch (type) {
    case 'request_paid_reviewer': {
      const url = requestId ? appRequestUrl(requestId, 'reviewer') : `${getSiteOrigin()}/app/requests`;
      return {
        subject: 'New paid review request on Auro',
        text: `Payment received from ${revieweeName}. Accept or decline within 14 days: ${url}`,
        html: wrapProductEmailHtml({
          title: 'New paid review request',
          bodyHtml: `<p>Hi there,</p><p><strong>${revieweeName}</strong> just paid for a review. You have <strong>14 days</strong> to accept or decline.</p><p>If you decline, they are refunded automatically.</p>`,
          ctaLabel: 'View request',
          ctaUrl: url,
        }),
      };
    }
    case 'payment_receipt_reviewee': {
      const url = requestId ? appRequestUrl(requestId, 'reviewee') : `${getSiteOrigin()}/app/requests`;
      return {
        subject: 'Your Auro payment receipt',
        text: `We received your payment${amount ? ` (${amount})` : ''}. Your reviewer will respond within 14 days. ${url}`,
        html: wrapProductEmailHtml({
          title: 'Payment confirmed',
          bodyHtml: `<p>Thanks for your order${amount ? ` — <strong>${amount}</strong>` : ''}.</p><p><strong>${reviewerName}</strong> can accept or decline within 14 days. If they decline, you are refunded automatically.</p>`,
          ctaLabel: 'View your request',
          ctaUrl: url,
        }),
      };
    }
    case 'request_accepted_reviewee': {
      const url = requestId ? appRequestUrl(requestId, 'reviewee') : `${getSiteOrigin()}/app/requests`;
      return {
        subject: `${reviewerName} accepted your review request`,
        text: `${reviewerName} is working on your review. Expect it within 48 hours: ${url}`,
        html: wrapProductEmailHtml({
          title: 'Review in progress',
          bodyHtml: `<p><strong>${reviewerName}</strong> accepted your request and is recording your review now.</p><p>You'll be notified when it's ready (usually within 48 hours).</p>`,
          ctaLabel: 'View request',
          ctaUrl: url,
        }),
      };
    }
    case 'review_completed_reviewee': {
      const url = requestId ? appRequestUrl(requestId, 'reviewee') : `${getSiteOrigin()}/app/requests`;
      return {
        subject: 'Your video review is ready',
        text: `${reviewerName} submitted your review. Watch it now: ${url}`,
        html: wrapProductEmailHtml({
          title: 'Your review is ready',
          bodyHtml: `<p><strong>${reviewerName}</strong> just submitted your video review.</p><p>Tap below to watch honest, actionable feedback.</p>`,
          ctaLabel: 'Watch your review',
          ctaUrl: url,
        }),
      };
    }
    case 'request_declined_reviewee': {
      const url = `${getSiteOrigin()}/app/requests`;
      return {
        subject: 'Your review request was declined — refund processing',
        text: `${reviewerName} declined your request. Your refund is processing and should appear within a few business days.`,
        html: wrapProductEmailHtml({
          title: 'Request declined',
          bodyHtml: `<p><strong>${reviewerName}</strong> declined this request.</p><p>Your refund is processing and should appear on your card within a few business days.</p>`,
          ctaLabel: 'View requests',
          ctaUrl: url,
        }),
      };
    }
    case 'payout_sent_reviewer': {
      const url = `${getSiteOrigin()}/app`;
      return {
        subject: 'You got paid on Auro',
        text: `Your payout${amount ? ` of ${amount}` : ''} was sent to your connected account.`,
        html: wrapProductEmailHtml({
          title: 'Payout sent',
          bodyHtml: `<p>Your earnings${amount ? ` (<strong>${amount}</strong>)` : ''} have been transferred to your Stripe account.</p>`,
          ctaLabel: 'Open dashboard',
          ctaUrl: url,
        }),
      };
    }
    case 'deadline_warning_reviewer': {
      const url = requestId ? appRequestUrl(requestId, 'reviewer') : `${getSiteOrigin()}/app/requests`;
      return {
        subject: `Review deadline in ${hoursLeft || 'soon'}`,
        text: `You have ${hoursLeft || 'limited time'} left to complete a review. ${url}`,
        html: wrapProductEmailHtml({
          title: 'Deadline approaching',
          bodyHtml: `<p>You have <strong>${hoursLeft || 'limited time'}</strong> left to submit this review.</p><p>If you miss the deadline, the customer is refunded automatically.</p>`,
          ctaLabel: 'Complete review',
          ctaUrl: url,
        }),
      };
    }
    case 'timeout_refund_reviewee': {
      const url = `${getSiteOrigin()}/app/requests`;
      return {
        subject: 'Your review request expired — refund processing',
        text: 'Your request timed out before completion. Your refund is processing.',
        html: wrapProductEmailHtml({
          title: 'Request expired',
          bodyHtml: `<p>Your review request expired before it could be completed.</p><p>Your refund is processing and should appear on your card within a few business days.</p>`,
          ctaLabel: 'View requests',
          ctaUrl: url,
        }),
      };
    }
    case 'timeout_refund_reviewer': {
      const url = `${getSiteOrigin()}/app/requests`;
      return {
        subject: 'Review request timed out',
        text: 'A review request timed out and was refunded to the customer.',
        html: wrapProductEmailHtml({
          title: 'Request timed out',
          bodyHtml: `<p>A review request timed out and was automatically refunded to the customer.</p>`,
          ctaLabel: 'View requests',
          ctaUrl: url,
        }),
      };
    }
    case 'reviewer_application_decision': {
      const approved = decision === 'approved';
      const url = approved ? `${getSiteOrigin()}/app` : `${getSiteOrigin()}/reviewers/apply`;
      return {
        subject: approved ? 'You are approved as an Auro reviewer' : 'Update on your Auro reviewer application',
        text: approved
          ? 'Congratulations — you can start accepting paid review requests.'
          : 'Your reviewer application was not approved at this time.',
        html: wrapProductEmailHtml({
          title: approved ? 'You are approved' : 'Application update',
          bodyHtml: approved
            ? `<p>Congratulations — you're approved to review on Auro.</p><p>Complete Stripe setup if you haven't already, then start accepting requests.</p>`
            : `<p>Thanks for applying. We are not able to approve your reviewer application at this time.</p>`,
          ctaLabel: approved ? 'Go to dashboard' : 'Learn more',
          ctaUrl: url,
        }),
      };
    }
    case 'reviewer_rating_received': {
      const url = `${getSiteOrigin()}/app`;
      return {
        subject: `New ${rating}-star rating on Auro`,
        text: `Someone left you a ${rating}-star rating.${commentSnippet ? ` "${commentSnippet}"` : ''}`,
        html: wrapProductEmailHtml({
          title: 'New rating',
          bodyHtml: `<p>You received a <strong>${rating}-star</strong> rating from a customer.</p>${commentSnippet ? `<p style="font-style:italic;">"${commentSnippet}"</p>` : ''}`,
          ctaLabel: 'Open dashboard',
          ctaUrl: url,
        }),
      };
    }
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
