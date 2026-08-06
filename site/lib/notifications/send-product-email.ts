import { Resend } from 'resend';
import { buildProductEmailMessage } from '@/lib/notifications/email-messages';
import { productEmailFrom, productEmailReplyTo } from '@/lib/notifications/founder-email-config';
import type { ProductNotificationType } from '@/lib/notifications/types';

export type SendProductEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean };

export async function sendProductEmail(params: {
  to: string;
  type: ProductNotificationType;
  data?: Record<string, string | number | undefined>;
}): Promise<SendProductEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured', skipped: true };
  }

  const from = productEmailFrom(params.type);
  const replyTo = productEmailReplyTo(params.type);
  const message = buildProductEmailMessage(params.type, params.data);

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      ...(replyTo ? { replyTo } : {}),
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
