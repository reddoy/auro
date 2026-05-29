import { buildProductSmsMessage } from '@/lib/notifications/sms-messages';
import type { ProductNotificationType } from '@/lib/notifications/types';

export type SendProductSmsResult =
  | { ok: true; sid: string }
  | { ok: false; error: string; skipped?: boolean };

export async function sendProductSms(params: {
  to: string;
  type: ProductNotificationType;
  data?: Record<string, string | number | undefined>;
}): Promise<SendProductSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'Twilio not configured', skipped: true };
  }

  const body = buildProductSmsMessage(params.type, params.data);
  if (!body) {
    return { ok: false, error: 'No SMS template for notification type', skipped: true };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: params.to,
        From: fromNumber,
        Body: body.slice(0, 1600),
      }),
    });

    const result = (await response.json()) as { sid?: string; message?: string };
    if (!response.ok) {
      return { ok: false, error: result.message || `Twilio HTTP ${response.status}` };
    }
    if (!result.sid) {
      return { ok: false, error: 'Twilio returned no message sid' };
    }
    return { ok: true, sid: result.sid };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Twilio send failed';
    return { ok: false, error: msg };
  }
}
