import { FOUNDER_CONTACT_EMAIL } from '@/lib/notifications/founder-email-config';

export function emailGreeting(firstName: string | undefined): string {
  const name = typeof firstName === 'string' && firstName.trim() ? firstName.trim() : 'there';
  return `Hi ${name},`;
}

export function founderContactText(): string {
  return `If you have any questions, reply here or email ${FOUNDER_CONTACT_EMAIL}.`;
}

export function founderContactHtml(): string {
  return `If you have any questions, reply here or email <a href="mailto:${FOUNDER_CONTACT_EMAIL}" style="color:#FF6B35;text-decoration:none;">${FOUNDER_CONTACT_EMAIL}</a>.`;
}

export function founderSignOffText(): string {
  return '— RJ';
}

export function founderSignOffHtml(): string {
  return `<p style="margin-top:24px;color:#FFFFFF;">— RJ</p>`;
}
