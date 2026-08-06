import { Resend } from 'resend';
import { appRequestUrl } from '@/lib/notifications/site-url';
import { wrapProductEmailHtml } from '@/lib/notifications/email-layout';

export type FounderRequestUpdateParams = {
  to: string;
  revieweeFirstName: string;
  reviewerName: string;
  requestId: string;
};

export function buildFounderRequestUpdateEmail(params: FounderRequestUpdateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { revieweeFirstName, reviewerName, requestId } = params;
  const firstName = revieweeFirstName.trim() || 'there';
  const reviewer = reviewerName.trim() || 'your reviewer';
  const requestUrl = appRequestUrl(requestId, 'reviewee');

  const text = [
    `Hi ${firstName},`,
    '',
    `I'm RJ — I run Auro. Thanks for signing up.`,
    '',
    `I work with our reviewers directly. I'm talking to ${reviewer} about your request now.`,
    '',
    `If you have questions, just reply here or email rj@appauro.com.`,
    '',
    'RJ',
    '',
    requestUrl,
  ].join('\n');

  const html = wrapProductEmailHtml({
    title: 'Quick note',
    bodyHtml: `
      <p>Hi ${firstName},</p>
      <p>I'm RJ — I run Auro. Thanks for signing up.</p>
      <p>I work with our reviewers directly. I'm talking to ${reviewer} about your request now.</p>
      <p>If you have questions, reply here or email <a href="mailto:rj@appauro.com" style="color:#FF6B35;text-decoration:none;">rj@appauro.com</a>.</p>
      <p style="margin-top:24px;color:#FFFFFF;">RJ</p>
    `,
    ctaLabel: 'Your request',
    ctaUrl: requestUrl,
    footerHtml: '',
  });

  return {
    subject: 'Re: your Auro request',
    html,
    text,
  };
}

export type SendFounderEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean };

export async function sendFounderEmail(params: FounderRequestUpdateParams): Promise<SendFounderEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured', skipped: true };
  }

  const from =
    process.env.RESEND_FOUNDER_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'RJ from Auro <notifications@appauro.com>';
  const replyTo = process.env.FOUNDER_REPLY_TO_EMAIL || 'rj@appauro.com';

  const message = buildFounderRequestUpdateEmail(params);

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      return { ok: false, error: error.message || 'Resend send failed' };
    }
    if (!data?.id) {
      return { ok: false, error: 'Resend returned no message id' };
    }
    return { ok: true, id: data.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Resend send failed';
    return { ok: false, error: msg };
  }
}
