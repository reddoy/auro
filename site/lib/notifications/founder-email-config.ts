import type { ProductNotificationType } from '@/lib/notifications/types';

export const FOUNDER_CONTACT_EMAIL = 'rj@appauro.com';

/** Request lifecycle emails sent personally from RJ. */
export const FOUNDER_LIFECYCLE_EMAIL_TYPES: ReadonlySet<ProductNotificationType> = new Set([
  'payment_receipt_reviewee',
  'request_paid_reviewer',
  'request_accepted_reviewee',
  'review_completed_reviewee',
]);

export function founderEmailFrom(): string {
  return (
    process.env.RESEND_FOUNDER_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    `RJ from Auro <${FOUNDER_CONTACT_EMAIL}>`
  );
}

export function founderEmailReplyTo(): string {
  return process.env.FOUNDER_REPLY_TO_EMAIL || FOUNDER_CONTACT_EMAIL;
}

export function productEmailFrom(type: ProductNotificationType): string {
  if (FOUNDER_LIFECYCLE_EMAIL_TYPES.has(type)) {
    return founderEmailFrom();
  }
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.RESEND_PRODUCT_FROM ||
    'Auro <notifications@appauro.com>'
  );
}

export function productEmailReplyTo(type: ProductNotificationType): string | undefined {
  if (FOUNDER_LIFECYCLE_EMAIL_TYPES.has(type)) {
    return founderEmailReplyTo();
  }
  return undefined;
}
