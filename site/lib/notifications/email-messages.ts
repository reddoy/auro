import {
  appForgotPasswordUrl,
  appProfileUrl,
  appRequestUrl,
  appRequestsUrl,
  appSignInUrl,
  appSupportUrl,
  getSiteOrigin,
} from '@/lib/notifications/site-url';
import {
  emailGreeting,
  emailGreetingHtml,
  emailInlineLink,
  emailStrong,
  emailFaqItem,
  founderContactHtml,
  founderContactPersonalHtml,
  founderContactPersonalText,
  founderContactText,
  founderSignOffHtml,
  founderSignOffText,
} from '@/lib/notifications/email-copy-helpers';
import {
  emailBulletList,
  emailHighlightBox,
  emailOrderedList,
  emailParagraph,
  emailSectionHeading,
  wrapProductEmailHtml,
} from '@/lib/notifications/email-layout';
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
  const profileUrl = appProfileUrl();

  switch (type) {
    case 'request_paid_reviewer': {
      const url = requestId ? appRequestUrl(requestId, 'reviewer') : appRequestsUrl();
      const signInUrl = appSignInUrl(url);
      const forgotPasswordUrl = appForgotPasswordUrl();
      const requestsUrl = appRequestsUrl();
      const supportUrl = appSupportUrl();
      const greeting = emailGreeting(recipientFirstName);

      return {
        subject: `New review request from ${revieweeName} — step-by-step guide`,
        text: [
          greeting,
          '',
          'Thank you for being a reviewer on Auro. Customers trust you for honest feedback, and I really appreciate you being part of this.',
          '',
          `${revieweeName} just paid for a review. Here is exactly what to do:`,
          '',
          'Before you start',
          `- Sign in to Auro: ${signInUrl}`,
          `- Forgot your password? Reset it here: ${forgotPasswordUrl}`,
          '',
          'Step 1 — Open the request',
          `- Your request page: ${url}`,
          `- Or see all requests: ${requestsUrl}`,
          '',
          'Step 2 — Accept or decline (within 14 days)',
          'Accept if you can deliver a thoughtful video review. Decline if you cannot — they are refunded automatically.',
          '',
          'Step 3 — Download their photos and read their notes',
          'On the request page, download their photos and read everything they submitted before you record.',
          '',
          'Step 4 — Record with green screen (TikTok or Instagram)',
          'There is no in-app recorder. Use the green screen effect in TikTok or Instagram:',
          '1. Open TikTok or Instagram → Effects → Green Screen.',
          '2. Pick one of their photos as the background.',
          '3. Record your feedback with your face on camera — be honest, specific, and actionable.',
          '4. Export/save the video to your phone.',
          '',
          'Step 5 — Upload your video and submit on Auro',
          'Go back to the request page, upload the video you recorded, and submit. You have 72 hours after accepting to deliver.',
          '',
          'Step 6 — Get paid via Stripe Connect',
          `Finish payout setup on your Profile if you have not already: ${profileUrl}`,
          'Payout runs automatically after you submit.',
          '',
          'FAQ',
          'Q: What if I decline?',
          'A: They get a full refund automatically. No hard feelings — only accept if you can deliver.',
          '',
          'Q: What if I accept but miss the 72-hour delivery window?',
          'A: The customer may be refunded. Accept only when you have time to record in the next few days.',
          '',
          'Q: How much do I earn?',
          'A: You keep 80% of the review price. The amount is shown on the request before you accept.',
          '',
          'Q: I already finished Stripe setup — anything else?',
          'A: Just accept, record, and submit. Payout is automatic after submission.',
          '',
          'Q: Something broken or confusing?',
          `A: Reply to this email or visit Support: ${supportUrl}`,
          '',
          founderContactPersonalText(),
          '',
          founderSignOffText(),
          '',
          url,
        ].join('\n'),
        html: wrapProductEmailHtml({
          title: 'New paid review request',
          bodyHtml: [
            emailParagraph(emailGreetingHtml(recipientFirstName)),
            emailParagraph(
              'Thank you for being a reviewer on Auro. Customers trust you for honest feedback, and I really appreciate you being part of this.'
            ),
            emailParagraph(`${emailStrong(revieweeName)} just paid for a review. Here is exactly what to do:`),
            emailSectionHeading('Before you start'),
            emailBulletList([
              `Sign in to Auro: ${emailInlineLink(signInUrl, 'Sign in')}`,
              `Forgot your password? ${emailInlineLink(forgotPasswordUrl, 'Reset it here')}`,
            ]),
            emailSectionHeading('Step 1 — Open the request'),
            emailBulletList([
              emailInlineLink(url, 'Open this request'),
              `Or ${emailInlineLink(requestsUrl, 'view all your requests')}`,
            ]),
            emailSectionHeading('Step 2 — Accept or decline (within 14 days)'),
            emailParagraph(
              'Accept if you can deliver a thoughtful video review. Decline if you cannot — they are refunded automatically.'
            ),
            emailSectionHeading('Step 3 — Download their photos and read their notes'),
            emailParagraph(
              'On the request page, download their photos and read everything they submitted before you record.'
            ),
            emailSectionHeading('Step 4 — Record with green screen (TikTok or Instagram)'),
            emailHighlightBox(
              [
                emailParagraph('There is no in-app recorder. Use the green screen effect in TikTok or Instagram:'),
                emailOrderedList([
                  'Open TikTok or Instagram → Effects → Green Screen.',
                  'Pick one of their photos as the background.',
                  'Record your feedback with your face on camera — be honest, specific, and actionable.',
                  'Export/save the video to your phone.',
                ]),
              ].join('')
            ),
            emailSectionHeading('Step 5 — Upload your video and submit on Auro'),
            emailParagraph(
              'Go back to the request page, upload the video you recorded, and submit. You have 72 hours after accepting to deliver.'
            ),
            emailSectionHeading('Step 6 — Get paid via Stripe Connect'),
            emailParagraph(
              `Finish payout setup on your ${emailInlineLink(profileUrl, 'Profile')} if you have not already. Payout runs automatically after you submit.`
            ),
            emailSectionHeading('FAQ'),
            emailFaqItem('What if I decline?', 'They get a full refund automatically. Only accept if you can deliver.'),
            emailFaqItem(
              'What if I miss the 72-hour delivery window?',
              'The customer may be refunded. Accept only when you have time to record in the next few days.'
            ),
            emailFaqItem(
              'How much do I earn?',
              'You keep 80% of the review price. The amount is shown on the request before you accept.'
            ),
            emailFaqItem(
              'I already finished Stripe setup — anything else?',
              'Just accept, record, and submit. Payout is automatic after submission.'
            ),
            emailFaqItem(
              'Something broken or confusing?',
              `Reply to this email or visit ${emailInlineLink(supportUrl, 'Support')}.`
            ),
            emailParagraph(founderContactPersonalHtml()),
            founderSignOffHtml(),
          ].join(''),
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
          'Thanks for choosing Auro!',
          '',
          `I'm RJ. I work with all of our reviewers personally, and I'm reaching out to ${reviewerName} now to guide them on accepting and submitting your request.`,
          '',
          'I used to struggle on dating apps — it was hard to find someone I could actually trust for honest feedback. That is what we are building here, and it means a lot that you chose us.',
          '',
          founderContactPersonalText(),
          '',
          founderSignOffText(),
          '',
          url,
        ].join('\n'),
        html: wrapProductEmailHtml({
          title: 'Thanks for choosing Auro',
          bodyHtml: [
            emailParagraph(emailGreetingHtml(recipientFirstName)),
            emailParagraph('Thanks for choosing Auro!'),
            emailParagraph(
              `I'm RJ. I work with all of our reviewers personally, and I'm reaching out to ${emailStrong(reviewerName)} now to guide them on accepting and submitting your request.`
            ),
            emailParagraph(
              'I used to struggle on dating apps — it was hard to find someone I could actually trust for honest feedback. That is what we are building here, and it means a lot that you chose us.'
            ),
            emailParagraph(founderContactPersonalHtml()),
            founderSignOffHtml(),
          ].join(''),
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
          'You can expect it within 72 hours. I will email you as soon as it is submitted and ready to watch.',
          '',
          founderContactPersonalText(),
          '',
          founderSignOffText(),
          '',
          url,
        ].join('\n'),
        html: wrapProductEmailHtml({
          title: 'Review in progress',
          bodyHtml: [
            emailParagraph(emailGreetingHtml(recipientFirstName)),
            emailParagraph(
              `Good news — ${emailStrong(reviewerName)} accepted your request and is working on your review now.`
            ),
            emailParagraph(
              'You can expect it within 72 hours. I will email you as soon as it is submitted and ready to watch.'
            ),
            emailParagraph(founderContactPersonalHtml()),
            founderSignOffHtml(),
          ].join(''),
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
          `Thanks again for choosing Auro — ${reviewerName} just submitted your review, and it is ready to watch now.`,
          '',
          'I really appreciate you trusting us with something this personal. Tap below for honest, actionable feedback you can put to work right away.',
          '',
          founderContactPersonalText(),
          '',
          founderSignOffText(),
          '',
          url,
        ].join('\n'),
        html: wrapProductEmailHtml({
          title: 'Your review is ready',
          bodyHtml: [
            emailParagraph(emailGreetingHtml(recipientFirstName)),
            emailParagraph(
              `Thanks again for choosing Auro — ${emailStrong(reviewerName)} just submitted your review, and it is ready to watch now.`
            ),
            emailParagraph(
              'I really appreciate you trusting us with something this personal. Tap below for honest, actionable feedback you can put to work right away.'
            ),
            emailParagraph(founderContactPersonalHtml()),
            founderSignOffHtml(),
          ].join(''),
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
