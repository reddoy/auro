import { EMAIL_BRAND } from '@/lib/notifications/email-brand';
import { FOUNDER_CONTACT_EMAIL } from '@/lib/notifications/founder-email-config';

export function emailInlineLink(href: string, label: string): string {
  return `<a href="${href}" style="color:${EMAIL_BRAND.accent};text-decoration:none;font-weight:600;">${label}</a>`;
}

export function emailGreeting(firstName: string | undefined): string {
  const name = typeof firstName === 'string' && firstName.trim() ? firstName.trim() : 'there';
  return `Hi ${name},`;
}

export function emailGreetingHtml(firstName: string | undefined): string {
  return `<span style="color:${EMAIL_BRAND.heading};font-weight:600;">${emailGreeting(firstName)}</span>`;
}

export function emailStrong(text: string): string {
  return `<strong style="color:${EMAIL_BRAND.heading};font-weight:700;">${text}</strong>`;
}

export function emailFaqItem(question: string, answer: string): string {
  return `<p style="margin:0 0 12px;color:${EMAIL_BRAND.text};font-size:15px;line-height:24px;"><strong style="color:${EMAIL_BRAND.heading};">${question}</strong><br />${answer}</p>`;
}

export function founderContactText(): string {
  return `If you have any questions, reply here or email ${FOUNDER_CONTACT_EMAIL}.`;
}

export function founderContactHtml(): string {
  return `If you have any questions, reply here or email ${emailInlineLink(`mailto:${FOUNDER_CONTACT_EMAIL}`, FOUNDER_CONTACT_EMAIL)}.`;
}

export function founderContactPersonalText(): string {
  return `If you have any questions, reply here or email me at ${FOUNDER_CONTACT_EMAIL}. I look at every email!`;
}

export function founderContactPersonalHtml(): string {
  return `If you have any questions, reply here or email me at ${emailInlineLink(`mailto:${FOUNDER_CONTACT_EMAIL}`, FOUNDER_CONTACT_EMAIL)}. I look at every email!`;
}

export function founderSignOffText(): string {
  return '— RJ';
}

export function founderSignOffHtml(): string {
  return `<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${EMAIL_BRAND.cardBorder};color:${EMAIL_BRAND.heading};font-size:16px;font-weight:600;">— RJ</p>`;
}
