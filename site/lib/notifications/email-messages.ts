import { appRequestUrl, getSiteOrigin } from '@/lib/notifications/site-url';
import {
  emailGreeting,
  founderContactHtml,
  founderContactText,
  founderSignOffHtml,
  founderSignOffText,
} from '@/lib/notifications/email-copy-helpers';
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
  const recipientFirstName =
    typeof data.recipientFirstName === 'string' ? data.recipientFirstName : undefined;
  const profileUrl = `${getSiteOrigin()}/app/profile`;

  switch (type) {
    case 'request_paid_reviewer': {
      const url = requestId ? appRequestUrl(requestId, 'reviewer') : `${getSiteOrigin()}/app/requests`;
      const greeting = emailGreeting(recipientFirstName);
      return {
        subject: 'New paid review request — how to accept and get paid',
        text: [
          greeting,
          '',
          `${revieweeName} just paid for a review on Auro. Here is how to handle it:`,
          '',
          '1. Open the request and Accept or Decline within 14 days. If you decline, they are refunded automatically.',
          '2. Review their photos and notes. Be honest, specific, and actionable — that is what they are paying for.',
          '3. Record your video review in the app. Talk through what is working, what is not, and what to change.',
          '4. Submit when you are done. You have 48 hours after accepting to deliver.',
          '5. Get paid. If you have not finished Stripe Connect setup yet, do that in your profile first — payout runs after you submit.',
          '',
          founderContactText(),
          '',
          founderSignOffText(),
          '',
          url,
          profileUrl,
        ].join('\n'),
        html: wrapProductEmailHtml({
          title: 'New paid review request',
          bodyHtml: `
            <p>${greeting}</p>
            <p><strong>${revieweeName}</strong> just paid for a review on Auro. Here is how to handle it:</p>
            <ol style="padding-left:20px;margin:16px 0;">
              <li style="margin-bottom:10px;"><strong>Accept or decline</strong> within 14 days. If you decline, they are refunded automatically.</li>
              <li style="margin-bottom:10px;"><strong>Review their photos and notes.</strong> Be honest, specific, and actionable — that is what they are paying for.</li>
              <li style="margin-bottom:10px;"><strong>Record your video review</strong> in the app. Talk through what is working, what is not, and what to change.</li>
              <li style="margin-bottom:10px;"><strong>Submit</strong> when you are done. You have 48 hours after accepting to deliver.</li>
              <li style="margin-bottom:10px;"><strong>Get paid.</strong> Finish Stripe Connect in your profile if you have not already — payout runs after you submit.</li>
            </ol>
            <p>${founderContactHtml()}</p>
            ${founderSignOffHtml()}
          `,
          ctaLabel: 'View request',
          ctaUrl: url,
          footerHtml: '',
        }),
      };
    }
    case 'payment_receipt_reviewee': {
      const url = requestId ? appRequestUrl(requestId, 'reviewee') : `${getSiteOrigin()}/app/requests`;
      const greeting = emailGreeting(recipientFirstName);
      return {
        subject: 'Thanks for choosing Auro',
        text: [
          greeting,
          '',
          `Thanks for choosing Auro${amount ? ` — your payment of ${amount} is confirmed` : ''}.`,
          '',
          `I'm RJ. I work with all of our reviewers personally, and I'm reaching out to ${reviewerName} now to make sure they accept your request as soon as possible.`,
          '',
          'I used to struggle on dating apps too — it was hard to find someone I could actually trust for honest feedback. That is what we are building here, and it means a lot that you chose us.',
          '',
          founderContactText(),
          '',
          founderSignOffText(),
          '',
          url,
        ].join('\n'),
        html: wrapProductEmailHtml({
          title: 'Thanks for choosing Auro',
          bodyHtml: `
            <p>${greeting}</p>
            <p>Thanks for choosing Auro${amount ? ` — your payment of <strong>${amount}</strong> is confirmed` : ''}.</p>
            <p>I'm RJ. I work with all of our reviewers personally, and I'm reaching out to <strong>${reviewerName}</strong> now to make sure they accept your request as soon as possible.</p>
            <p>I used to struggle on dating apps too — it was hard to find someone I could actually trust for honest feedback. That is what we are building here, and it means a lot that you chose us.</p>
            <p>${founderContactHtml()}</p>
            ${founderSignOffHtml()}
          `,
          ctaLabel: 'View your request',
          ctaUrl: url,
          footerHtml: '',
        }),
      };
    }
    case 'request_accepted_reviewee': {
      const url = requestId ? appRequestUrl(requestId, 'reviewee') : `${getSiteOrigin()}/app/requests`;
      const greeting = emailGreeting(recipientFirstName);
      return {
        subject: `${reviewerName} accepted your review request`,
        text: [
          greeting,
          '',
          `Good news — ${reviewerName} accepted your request and is working on your review now.`,
          '',
          'You can expect it within 48 hours. I will email you as soon as it is submitted and ready to watch.',
          '',
          founderContactText(),
          '',
          founderSignOffText(),
          '',
          url,
        ].join('\n'),
        html: wrapProductEmailHtml({
          title: 'Review in progress',
          bodyHtml: `
            <p>${greeting}</p>
            <p>Good news — <strong>${reviewerName}</strong> accepted your request and is working on your review now.</p>
            <p>You can expect it within 48 hours. I will email you as soon as it is submitted and ready to watch.</p>
            <p>${founderContactHtml()}</p>
            ${founderSignOffHtml()}
          `,
          ctaLabel: 'View request',
          ctaUrl: url,
          footerHtml: '',
        }),
      };
    }
    case 'review_completed_reviewee': {
      const url = requestId ? appRequestUrl(requestId, 'reviewee') : `${getSiteOrigin()}/app/requests`;
      const greeting = emailGreeting(recipientFirstName);
      return {
        subject: 'Your video review is ready to watch',
        text: [
          greeting,
          '',
          `${reviewerName} just submitted your review. It is ready to watch now.`,
          '',
          'Tap the link below for honest, actionable feedback you can put to work right away.',
          '',
          founderContactText(),
          '',
          founderSignOffText(),
          '',
          url,
        ].join('\n'),
        html: wrapProductEmailHtml({
          title: 'Your review is ready',
          bodyHtml: `
            <p>${greeting}</p>
            <p><strong>${reviewerName}</strong> just submitted your review. It is ready to watch now.</p>
            <p>Tap below for honest, actionable feedback you can put to work right away.</p>
            <p>${founderContactHtml()}</p>
            ${founderSignOffHtml()}
          `,
          ctaLabel: 'Watch your review',
          ctaUrl: url,
          footerHtml: '',
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
