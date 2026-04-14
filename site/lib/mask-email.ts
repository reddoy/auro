/** e.g. "jane.doe@example.com" → "ja***@example.com" */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  const visible = local.slice(0, 2);
  if (local.length <= 2) return `${visible}••@${domain}`;
  return `${visible}•••@${domain}`;
}
